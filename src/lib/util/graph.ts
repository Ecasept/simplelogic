import { get, writable } from "svelte/store";
import { COMPONENT_IO_MAPPING, deepCopy } from "./global";
import type {
	Command,
	ComponentConnection,
	ComponentData,
	GraphData,
	HandleType,
	WireConnection,
	WireData,
	XYPair,
} from "./types";

export class CommandGroup implements Command {
	constructor(private commands: Command[]) {}
	execute(graphData: GraphData) {
		for (const command of this.commands) {
			command.execute(graphData);
		}
	}
	undo(graphData: GraphData) {
		for (let i = this.commands.length - 1; i >= 0; i--) {
			this.commands[i].undo(graphData);
		}
	}
}

export class ConnectCommand implements Command {
	oldFrom: ComponentConnection | WireConnection | null = null;
	oldTo: ComponentConnection | WireConnection | null = null;

	constructor(
		private from: ComponentConnection | WireConnection,
		private to: ComponentConnection | WireConnection,
	) {}

	execute(graphData: GraphData) {
		if ("handleId" in this.from) {
			const handle =
				graphData.components[this.from.id].connections[this.from.handleId];
			this.oldFrom = handle.connection;
			handle.connection = this.to;
		} else {
			const handle = graphData.wires[this.from.id][this.from.handleType];
			this.oldFrom = handle.connection;
			handle.connection = this.to;
		}
		if ("handleId" in this.to) {
			const handle =
				graphData.components[this.to.id].connections[this.to.handleId];
			this.oldTo = handle.connection;
			handle.connection = this.from;
		} else {
			const handle = graphData.wires[this.to.id][this.to.handleType];
			this.oldTo = handle.connection;
			handle.connection = this.from;
		}
	}
	undo(graphData: GraphData) {
		if ("handleId" in this.from) {
			const handle =
				graphData.components[this.from.id].connections[this.from.handleId];
			handle.connection = this.oldFrom;
		} else {
			const handle = graphData.wires[this.from.id][this.from.handleType];
			handle.connection = this.oldFrom;
		}
		if ("handleId" in this.to) {
			const handle =
				graphData.components[this.to.id].connections[this.to.handleId];
			handle.connection = this.oldTo;
		} else {
			const handle = graphData.wires[this.to.id][this.to.handleType];
			handle.connection = this.oldTo;
		}
	}
}

export class MoveWireConnectionCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private type: HandleType,
		private wireId: number,
	) {}

	execute(graphData: GraphData) {
		const wireConnection = graphData.wires[this.wireId][this.type];
		this.oldPosition = { x: wireConnection.x, y: wireConnection.y };
		wireConnection.x = this.newPosition.x;
		wireConnection.y = this.newPosition.y;
	}

	undo(graphData: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}
		graphData.wires[this.wireId][this.type].x = this.oldPosition.x;
		graphData.wires[this.wireId][this.type].y = this.oldPosition.y;
		this.oldPosition = null;
	}
}

export class MoveComponentCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private componentId: number,
	) {}

	execute(graphData: GraphData) {
		this.oldPosition = deepCopy(
			graphData.components[this.componentId].position,
		);
		graphData.components[this.componentId].position = this.newPosition;
	}

	undo(graphData: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}
		graphData.components[this.componentId].position = this.oldPosition;
		this.oldPosition = null;
	}
}

export class CreateWireCommand implements Command {
	oldNextId: number | null = null;

	constructor(private newWireData: Omit<WireData, "id">) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;
		graphData.wires[graphData.nextId] = {
			...this.newWireData,
			id: graphData.nextId,
		};

		graphData.nextId++;
		return this.oldNextId;
	}
	undo(graphData: GraphData) {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		graphData.nextId = this.oldNextId;
		delete graphData.wires[this.oldNextId];

		this.oldNextId = null;
	}
}

export class CreateComponentCommand implements Command {
	oldNextId: number | null = null;

	constructor(private newComponentData: Omit<ComponentData, "id">) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;
		graphData.components[graphData.nextId] = {
			...this.newComponentData,
			id: graphData.nextId,
		};
		graphData.nextId++;
		return this.oldNextId;
	}

	undo(graphData: GraphData) {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		graphData.nextId = this.oldNextId;
		delete graphData.components[this.oldNextId];
		this.oldNextId = null;
	}
}

class Graph {
	data = writable<GraphData>({ components: {}, wires: {}, nextId: 0 });
	history = writable<Command[]>([]);

	constructor(private trackHistory: boolean) {}

	executeCommand(command: Command) {
		this.data.update((data) => {
			command.execute(data);
			return data;
		});
		this.history.update((arr) => {
			arr.push(command);
			return arr;
		});
	}

	undoLastCommand() {
		this.history.update((arr) => {
			const command = arr.pop();
			this.data.update((data) => {
				command?.undo(data);
				return data;
			});
			return arr;
		});
	}
}

const graph: Graph = new Graph(true);

type ViewModelNotifyFunction = ({
	data,
	adding,
}: {
	data: GraphData;
	adding: number | null;
}) => void;

class ViewModel {
	private currentData: GraphData = {
		components: {},
		wires: {},
		nextId: 0,
	};
	private history: Command[] = [];
	private adding: number | null = null;
	busy = false;

	constructor() {
		graph.data.subscribe((data) => {
			this.currentData = deepCopy(data);
			this.notifyAllSubscribers();
		});
	}

	executeCommand<C extends Command>(
		command: C,
		notify: boolean = true,
		replace: boolean = false,
	): ReturnType<C["execute"]> {
		this.busy = true;
		const prevCommand = this.history[this.history.length - 1];
		if (replace && prevCommand instanceof command.constructor) {
			prevCommand.undo(this.currentData);
			this.history.pop();
		}

		const res = command.execute(this.currentData);

		this.history.push(command);

		console.log("Command executed - History:");
		console.log(this.history);

		if (notify) {
			this.notifyAllSubscribers();
		}
		return res;
	}
	cancelChanges() {
		this.currentData = deepCopy(get(graph.data));

		this.history = [];
		this.adding = null;
		this.busy = false;

		this.notifyAllSubscribers();
	}

	applyChanges() {
		const cmd = new CommandGroup(this.history);

		this.history = [];
		this.adding = null;
		this.busy = false;

		graph.executeCommand(cmd);

		console.log("applied changes");
	}
	undo() {
		if (!this.busy) {
			graph.undoLastCommand();
		}
	}

	private subscribers: ViewModelNotifyFunction[] = [];

	// ==== Store Contract ====

	subscribe(subscriber: ViewModelNotifyFunction): () => void {
		this.subscribers.push(subscriber);
		subscriber({ data: this.currentData, adding: this.adding });
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	set(newVal: GraphData) {
		if (newVal !== this.currentData) {
			this.currentData = newVal;
		}
		this.notifyAllSubscribers();
	}

	setAdding(val: number) {
		this.adding = val;
		this.notifyAllSubscribers();
	}

	private notifyAllSubscribers() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc({ data: this.currentData, adding: this.adding });
		}
	}
}

export const viewModel: ViewModel = new ViewModel();
// interGraph.undoLastCommand();

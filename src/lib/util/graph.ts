import { get, writable } from "svelte/store";
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
		this.oldPosition = structuredClone(
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

export const graph: Graph = new Graph();

class GraphManager {
	private currentData: GraphData = { components: {}, wires: {}, nextId: 0 };
	private history: Command[] = [];

	constructor() {
		graph.data.subscribe((data) => {
			this.currentData = structuredClone(data);
			this.notifyAll();
		});
	}
	executeCommand<C extends Command>(
		command: C,
		replace: boolean = false,
	): ReturnType<C["execute"]> {
		const prevCommand = this.history[this.history.length - 1];
		if (replace && prevCommand instanceof command.constructor) {
			prevCommand.undo(this.currentData);
			this.history.pop();
		}

		const res = command.execute(this.currentData);

		this.history.push(command);

		console.log("Command executed - History:");
		console.log(this.history);

		return res;
	}
	cancelChanges() {
		this.currentData = structuredClone(get(graph.data));

		this.history = [];
	}
	applyChanges() {
		const cmd = new CommandGroup(this.history);

		this.history = [];

		graph.executeCommand(cmd);
	}
	undo() {
		if (this.history.length === 0) {
			graph.undoLastCommand();
		}
	}

	// ==== Store Contract ====

	private subscribers: ((graphData: GraphData) => void)[] = [];

	subscribe(subscriber: (graphData: GraphData) => void): () => void {
		this.subscribers.push(subscriber);
		subscriber(this.currentData);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	notifyAll() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc(this.currentData);
		}
	}
}

export const graphManager = new GraphManager();

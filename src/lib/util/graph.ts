import { get, writable } from "svelte/store";
import { deepCopy, GRID_SIZE } from "./global";
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
	uiState,
}: {
	data: GraphData;
	uiState: UiState;
}) => void;

export type UiState = {
	isMoving: boolean;
	isAdding: boolean;
	movingId: number | null;
	addingId: number | null;
	mouseOffset: XYPair | null;
	/** The handle of the wire that is being moved */
	movingWireHandleType: HandleType | null;
};

class ViewModel {
	private currentData: GraphData = {
		components: {},
		wires: {},
		nextId: 0,
	};
	private history: Command[] = [];

	private uiState: UiState = {
		isMoving: false,
		isAdding: false,
		movingId: null,
		addingId: null,
		mouseOffset: null,
		movingWireHandleType: null,
	};

	constructor() {
		graph.data.subscribe((data) => {
			this.currentData = deepCopy(data);
			this.notifyAll();
		});
	}

	private executeCommand<C extends Command>(
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

	private resetUiState() {
		this.uiState = {
			isMoving: false,
			isAdding: false,
			movingId: null,
			addingId: null,
			mouseOffset: null,
			movingWireHandleType: null,
		};
	}

	cancelChanges() {
		this.currentData = deepCopy(get(graph.data));

		this.resetUiState();
		this.history = [];

		this.notifyAll();
	}

	applyChanges() {
		const cmd = new CommandGroup(this.history);

		this.resetUiState();
		this.history = [];

		console.log("applied changes");
		graph.executeCommand(cmd);
	}
	undo() {
		if (!this.uiState.isAdding && !this.uiState.isMoving) {
			graph.undoLastCommand();
		}
	}

	// ==== Store Contract ====

	private subscribers: ViewModelNotifyFunction[] = [];

	subscribe(subscriber: ViewModelNotifyFunction): () => void {
		this.subscribers.push(subscriber);
		subscriber({
			data: this.currentData,
			uiState: this.uiState,
		});
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	notifyAll() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc({
				data: this.currentData,
				uiState: this.uiState,
			});
		}
	}

	// ==== Commands ====

	addComponent(newComponentData: Omit<ComponentData, "id">) {
		console.log("Command issued: addComponent");

		const cmd = new CreateComponentCommand(newComponentData);
		const id = this.executeCommand(cmd);
		this.uiState.isAdding = true;
		this.uiState.addingId = id;
		const size = this.currentData.components[id].size;
		this.uiState.mouseOffset = {
			x: (size.x * GRID_SIZE) / 2,
			y: (size.y * GRID_SIZE) / 2,
		};
		this.notifyAll();
	}
	addWire(
		newWireData: Omit<WireData, "id">,
		clickedHandleType: HandleType,
		componentConnection: ComponentConnection,
	) {
		console.log("Command issued: addWire");

		const createWireCmd = new CreateWireCommand(newWireData);
		const wireId = this.executeCommand(createWireCmd);
		const connectCmd = new ConnectCommand(
			{
				id: wireId,
				handleType: clickedHandleType === "input" ? "output" : "input",
			},
			componentConnection,
		);
		this.executeCommand(connectCmd);

		this.uiState.isAdding = true;
		this.uiState.addingId = wireId;
		this.uiState.movingWireHandleType = clickedHandleType;
		this.notifyAll();
	}

	startMoveComponent(id: number, mouseOffset: XYPair) {
		console.log("Command issued: startMoveComponent");

		this.uiState.isMoving = true;
		this.uiState.movingId = id;
		this.uiState.mouseOffset = mouseOffset;
		this.notifyAll();
	}
	moveComponentReplaceable(newPos: XYPair, id: number) {
		console.log("Command issued: moveComponentReplaceable");

		const cmd = new MoveComponentCommand(newPos, id);
		this.executeCommand(cmd, true);
		this.notifyAll();
	}
	moveWireConnectionReplaceable(
		newPos: XYPair,
		handleType: HandleType,
		id: number,
	) {
		console.log("Command issued: moveWireConnectionReplaceable");
		const cmd = new MoveWireConnectionCommand(newPos, handleType, id);
		this.executeCommand(cmd, true);
		this.notifyAll();
	}
}

export const viewModel: ViewModel = new ViewModel();
// interGraph.undoLastCommand();

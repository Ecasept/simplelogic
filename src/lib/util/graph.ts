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
	oldConnection1: ComponentConnection | WireConnection | null = null;
	oldConnection2: ComponentConnection | WireConnection | null = null;

	constructor(
		private connection1: ComponentConnection | WireConnection,
		private connection2: ComponentConnection | WireConnection,
	) {}

	execute(data: GraphData) {
		if ("handleId" in this.connection1) {
			const handle =
				data.components[this.connection1.id].connections[
					this.connection1.handleId
				];
			this.oldConnection1 = handle.connection;
			handle.connection = this.connection2;
		} else {
			const handle =
				data.wires[this.connection1.id][this.connection1.handleType];
			this.oldConnection1 = handle.connection;
			handle.connection = this.connection2;
		}
		if ("handleId" in this.connection2) {
			const handle =
				data.components[this.connection2.id].connections[
					this.connection2.handleId
				];
			this.oldConnection2 = handle.connection;
			handle.connection = this.connection1;
		} else {
			const handle =
				data.wires[this.connection2.id][this.connection2.handleType];
			this.oldConnection2 = handle.connection;
			handle.connection = this.connection1;
		}
	}
	undo(data: GraphData) {
		if ("handleId" in this.connection1) {
			const handle =
				data.components[this.connection1.id].connections[
					this.connection1.handleId
				];
			handle.connection = this.oldConnection1;
		} else {
			const handle =
				data.wires[this.connection1.id][this.connection1.handleType];
			handle.connection = this.oldConnection1;
		}
		if ("handleId" in this.connection2) {
			const handle =
				data.components[this.connection2.id].connections[
					this.connection2.handleId
				];
			handle.connection = this.oldConnection2;
		} else {
			const handle =
				data.wires[this.connection2.id][this.connection2.handleType];
			handle.connection = this.oldConnection2;
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

	execute(data: GraphData) {
		const wireConnection = data.wires[this.wireId][this.type];
		this.oldPosition = { x: wireConnection.x, y: wireConnection.y };
		wireConnection.x = this.newPosition.x;
		wireConnection.y = this.newPosition.x;
	}

	undo(data: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}
		data.wires[this.wireId][this.type].x = this.oldPosition.x;
		data.wires[this.wireId][this.type].y = this.oldPosition.y;
		this.oldPosition = null;
	}
}

export class MoveComponentCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private componentId: number,
	) {}

	execute(data: GraphData) {
		this.oldPosition = deepCopy(data.components[this.componentId].position);
		data.components[this.componentId].position = this.newPosition;
	}

	undo(data: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}
		data.components[this.componentId].position = this.oldPosition;
		this.oldPosition = null;
	}
}

export class AddWireCommand implements Command {
	oldNextId: number | null = null;
	connectCmd: ConnectCommand | null = null;

	constructor(
		private newWireData: Omit<WireData, "id">,
		private connection: WireConnection | ComponentConnection,
		private start: HandleType,
	) {}
	execute(data: GraphData) {
		this.oldNextId = data.nextId;
		data.wires[data.nextId] = { ...this.newWireData, id: data.nextId };

		this.connectCmd = new ConnectCommand(this.connection, {
			id: this.oldNextId,
			handleType: this.start,
		});

		data.nextId++;
		this.connectCmd?.execute(data);
	}

	undo(data: GraphData) {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		this.connectCmd?.undo(data);

		data.nextId = this.oldNextId;
		delete data.wires[this.oldNextId];

		this.oldNextId = null;
		this.connectCmd = null;
	}
}

export class AddComponentCommand implements Command {
	oldNextId: number | null = null;

	constructor(private newComponentData: Omit<ComponentData, "id">) {}
	execute(data: GraphData) {
		const type = this.newComponentData.type;
		if (!(type in COMPONENT_IO_MAPPING)) {
			console.error(`Tried to add component of non-existing type \"${type}\"!`);
			return;
		}

		this.oldNextId = data.nextId;
		data.components[data.nextId] = {
			...this.newComponentData,
			id: data.nextId,
		};
		data.nextId++;
	}

	undo(data: GraphData) {
		const type = this.newComponentData.type;
		if (!(type in COMPONENT_IO_MAPPING)) {
			console.error(
				`Tried to undo add component of non-existing type \"${type}\"!`,
			);
			return;
		}
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		data.nextId = this.oldNextId;
		delete data.components[this.oldNextId];
		this.oldNextId = null;
	}
}

class Graph {
	data = writable<GraphData>({ components: [], wires: [], nextId: 0 });
	history = writable<Command[]>([]);

	constructor(private trackHistory: boolean) {}

	executeCommand(command: Command) {
		console.log(this);

		this.data.update((data) => {
			command.execute(data);
			return data;
		});
		if (this.trackHistory) {
			this.history.update((arr) => {
				arr.push(command);
				return arr;
			});
		}
	}

	undoLastCommand() {
		if (this.trackHistory) {
			console.warn(
				"Tried to undo command on graph that is not tracking history",
			);
			return;
		}
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

export const graph: Graph = new Graph(true);

class IntermediaryGraph extends Graph {
	oldGraph: GraphData | null = null;
	constructor() {
		super(false);
	}

	executeCommand(command: Command): void {
		if (this.oldGraph === null) {
			this.oldGraph = get(this.data);
		}
	}
	cancelChanges() {
		if (this.oldGraph === null) {
			return;
		}
		this.data.set(this.oldGraph);
	}

	applyChanges() {
		// TODO
	}
}

export const interGraph: IntermediaryGraph = new IntermediaryGraph();

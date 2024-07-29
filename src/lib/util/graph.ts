import { graph_store, history_store } from "$lib/stores/stores";
import { COMPONENT_IO_MAPPING, deepCopy } from "./global";
import type {
	Command,
	ComponentConnection,
	ComponentHandleList,
	HandleType,
	WireConnection,
	WireHandle,
	XYPair,
} from "./types";

interface AddComponentData {
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentHandleList;
}

interface AddWireData {
	label: string;
	input: WireHandle;
	output: WireHandle;
}

export class ConnectCommand implements Command {
	oldConnection1: ComponentConnection | WireConnection | null = null;
	oldConnection2: ComponentConnection | WireConnection | null = null;

	constructor(
		private connection1: ComponentConnection | WireConnection,
		private connection2: ComponentConnection | WireConnection,
	) {}

	execute() {
		graph_store.update((data) => {
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
			return data;
		});
	}
	undo() {
		graph_store.update((data) => {
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
			return data;
		});
	}
}

export class MoveWireConnectionCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private type: HandleType,
		private wireId: number,
	) {}

	execute() {
		graph_store.update((data) => {
			const wireConnection = data.wires[this.wireId][this.type];
			this.oldPosition = { x: wireConnection.x, y: wireConnection.y };
			wireConnection.x = this.newPosition.x;
			wireConnection.y = this.newPosition.x;
			return data;
		});
	}

	undo() {
		graph_store.update((data) => {
			if (this.oldPosition === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}
			data.wires[this.wireId][this.type].x = this.oldPosition.x;
			data.wires[this.wireId][this.type].y = this.oldPosition.y;
			this.oldPosition = null;
			return data;
		});
	}
}

export class MoveComponentCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private componentId: number,
	) {}

	execute() {
		graph_store.update((data) => {
			this.oldPosition = deepCopy(data.components[this.componentId].position);
			data.components[this.componentId].position = this.newPosition;
			return data;
		});
	}

	undo() {
		graph_store.update((data) => {
			if (this.oldPosition === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}
			data.components[this.componentId].position = this.oldPosition;
			this.oldPosition = null;
			return data;
		});
	}
}

export class AddWireCommand implements Command {
	oldNextId: number | null = null;
	connectCmd: ConnectCommand | null = null;

	constructor(
		private newWireData: AddWireData,
		private connection: WireConnection | ComponentConnection,
		private start: HandleType,
	) {}
	execute() {
		graph_store.update((data) => {
			this.oldNextId = data.nextId;
			data.wires[data.nextId] = { ...this.newWireData, id: data.nextId };

			this.connectCmd = new ConnectCommand(this.connection, {
				id: this.oldNextId,
				handleType: this.start,
			});

			data.nextId++;
			return data;
		});
		this.connectCmd?.execute();
	}

	undo() {
		graph_store.update((data) => {
			if (this.oldNextId === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}

			this.connectCmd?.undo();

			data.nextId = this.oldNextId;
			delete data.wires[this.oldNextId];

			this.oldNextId = null;
			this.connectCmd = null;

			return data;
		});
	}
}

export class AddComponentCommand implements Command {
	oldNextId: number | null = null;

	constructor(private newComponentData: AddComponentData) {}
	execute() {
		const type = this.newComponentData.type;
		if (!(type in COMPONENT_IO_MAPPING)) {
			console.error(`Tried to add component of non-existing type \"${type}\"!`);
			return;
		}

		graph_store.update((data) => {
			this.oldNextId = data.nextId;
			data.components[data.nextId] = {
				...this.newComponentData,
				id: data.nextId,
			};
			data.nextId++;
			return data;
		});
	}

	undo() {
		const type = this.newComponentData.type;
		if (!(type in COMPONENT_IO_MAPPING)) {
			console.error(
				`Tried to undo add component of non-existing type \"${type}\"!`,
			);
			return;
		}
		graph_store.update((data) => {
			if (this.oldNextId === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}

			data.nextId = this.oldNextId;
			delete data.components[this.oldNextId];
			this.oldNextId = null;
			return data;
		});
	}
}

export function executeCommand(command: Command) {
	command.execute();
	history_store.update((arr) => {
		arr.push(command);
		return arr;
	});
}

export function undoLastCommand() {
	history_store.update((arr) => {
		const command = arr.pop();
		command?.undo();
		return arr;
	});
}

import { graph_store, history_store } from "$lib/stores/stores";
import type { ComponentType } from "svelte";
import { COMPONENT_IO_MAPPING, deepCopy } from "./global";
import type {
	Command,
	ComponentConnectionList,
	ConnectionType,
	WireConnection,
	XYPair,
} from "./types";

interface AddComponentData {
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentConnectionList;
}

interface AddWireData {
	label: string;
	input: WireConnection;
	output: WireConnection;
}

export class MoveWireConnectionCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private type: ConnectionType,
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

	constructor(private newWireData: AddWireData) {}
	execute() {
		graph_store.update((data) => {
			this.oldNextId = data.nextId;
			data.wires[data.nextId] = { ...this.newWireData, id: data.nextId };
			data.nextId++;
			return data;
		});
	}

	undo() {
		graph_store.update((data) => {
			if (this.oldNextId === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}

			data.nextId = this.oldNextId;
			delete data.wires[this.oldNextId];
			this.oldNextId = null;
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
		const command: Command | undefined = arr.pop();
		command?.undo();
		return arr;
	});
}

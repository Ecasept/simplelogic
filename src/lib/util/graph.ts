import { graph_store, history_store } from "$lib/stores/stores";
import { COMPONENT_IO_MAPPING, deepCopy } from "./global";
import type { Command, ComponentIOList, WireIO, XYPair } from "./types";

interface AddComponentData {
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	inputs: ComponentIOList;
	outputs: ComponentIOList;
}

interface AddWireData {
	label: string;
	input: WireIO;
	output: WireIO;
}

export class SetWireIOCommand implements Command {
	oldIO: WireIO | null = null;

	constructor(
		private newIO: WireIO,
		private type: "input" | "output",
		private wireId: number,
	) {}

	execute() {
		graph_store.update((data) => {
			this.oldIO = data.wires[this.wireId][this.type];
			data.wires[this.wireId][this.type] = this.newIO;
			return data;
		});
	}

	undo() {
		graph_store.update((data) => {
			if (this.oldIO === null) {
				console.error(`Tried to undo command that has not been executed`);
				return data;
			}
			data.wires[this.wireId][this.type] = this.oldIO;
			this.oldIO = null;
			return data;
		});
	}
}

export class SetComponentPositionCommand implements Command {
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

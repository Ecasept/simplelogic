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

export class SetComponentPositionCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private position: XYPair,
		private componentId: number,
	) {}

	execute() {
		graph_store.update((data) => {
			this.oldPosition = deepCopy(data.components[this.componentId].position);
			data.components[this.componentId].position = this.position;
			return data;
		});
	}

	undo() {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		} else {
			graph_store.update((data) => {
				data.components[this.componentId].position = this.oldPosition as XYPair;
				this.oldPosition = null;
				return data;
			});
		}
	}
}

export class AddWireCommand implements Command {
	oldNextId: number | null = null;

	constructor(private wireData: AddWireData) {}
	execute() {
		graph_store.update((data) => {
			this.oldNextId = data.nextId;
			data.wires[data.nextId] = { ...this.wireData, id: data.nextId };
			data.nextId++;
			return data;
		});
	}

	undo() {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		graph_store.update((data) => {
			data.nextId = this.oldNextId as number;
			delete data.wires[this.oldNextId as number];
			this.oldNextId = null;
			return data;
		});
	}
}

export class AddComponentCommand implements Command {
	oldNextId: number | null = null;

	constructor(private componentData: AddComponentData) {}
	execute() {
		const type = this.componentData.type;
		if (!(type in COMPONENT_IO_MAPPING)) {
			console.error(`Tried to add component of non-existing type \"${type}\"!`);
			return;
		}

		graph_store.update((data) => {
			this.oldNextId = data.nextId;
			data.components[data.nextId] = { ...this.componentData, id: data.nextId };
			data.nextId++;
			return data;
		});
	}

	undo() {
		const type = this.componentData.type;
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

		graph_store.update((data) => {
			data.nextId = this.oldNextId as number;
			delete data.components[this.oldNextId as number];
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

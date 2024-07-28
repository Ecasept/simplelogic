import type { AddWireCommand } from "./graph";

export type Handle = { type: string; pos: number };

// list of handles for each edge
export type ComponentIOList = {
	[key in "top" | "bottom" | "left" | "right"]?: Handle[];
};

export type WireIO = { x: number; y: number; id: number };

export type XYPair = { x: number; y: number };

interface Command {
	execute(): void;
	undo(): void | Command | null;
}

// ==== Graph Types ====

export interface WireData {
	id: number;
	label: string;
	input: WireIO;
	output: WireIO;
}

export interface ComponentData {
	id: number;
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	inputs: ComponentIOList;
	outputs: ComponentIOList;
}

export interface GraphData {
	wires: { [id in number]: WireData };
	components: { [id in number]: ComponentData };
	nextId: number;
}

// ==== Events ====

/** Event for when a handle was clicked */
export interface CreateWireEvent {
	/** the label of the new wire */
	label: string;
	/** the input of the new wire */
	input: WireIO;
	/** the output of the new wire */
	output: WireIO;
}

export interface CreateComponentEvent {
	type: string;
	label: string;
	size: XYPair;
	position: XYPair;
	inputs: ComponentIOList;
	outputs: ComponentIOList;
}

export type Edge = "top" | "bottom" | "left" | "right";

export type HandleType = "input" | "output";

export type ComponentConnection = { id: number; handleId: string };
export type WireConnection = { id: number; handleType: HandleType };

export type ComponentHandleList = {
	[handleId in string]: {
		edge: Edge;
		pos: number;
		type: HandleType;
		connection: WireConnection | ComponentConnection | null;
	};
};

export type WireHandle = {
	x: number;
	y: number;
	connection: WireConnection | ComponentConnection | null;
};

export type XYPair = { x: number; y: number };

interface Command {
	execute(): void;
	undo(): void | Command | null;
}

// ==== Graph Types ====

export interface WireData {
	id: number;
	label: string;
	input: WireHandle;
	output: WireHandle;
}

export interface ComponentData {
	id: number;
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentHandleList;
}

export interface GraphData {
	wires: { [id in number]: WireData };
	components: { [id in number]: ComponentData };
	nextId: number;
}

// ==== Events ====

/** Event for when a handle was clicked */
export interface WireCreateEvent {
	/** the label of the new wire */
	label: string;
	/** the input of the new wire */
	input: WireHandle;
	/** the output of the new wire */
	output: WireHandle;
	/** which handle the wire should start at */
	wireStart: HandleType;
	/** the first connection of the new wire */
	connection: ComponentConnection | WireConnection;
}

export interface ComponentCreateEvent {
	type: string;
	label: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentHandleList;
}

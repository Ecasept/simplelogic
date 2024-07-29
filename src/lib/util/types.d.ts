export type Handle = { pos: number; connectionId: number | null };

export type Edge = "top" | "bottom" | "left" | "right";

export type ConnectionType = "input" | "output";

export type ComponentConnectionList = {
	[handleIdentifier in string]: {
		edge: Edge;
		pos: number;
		type: ConnectionType;
	};
};

export type WireConnection = { x: number; y: number; id: number };

export type XYPair = { x: number; y: number };

interface Command {
	execute(): void;
	undo(): void | Command | null;
}

// ==== Graph Types ====

export interface WireData {
	id: number;
	label: string;
	input: WireConnection;
	output: WireConnection;
}

export interface ComponentData {
	id: number;
	label: string;
	type: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentConnectionList;
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
	input: WireConnection;
	/** the output of the new wire */
	output: WireConnection;
}

export interface ComponentCreateEvent {
	type: string;
	label: string;
	size: XYPair;
	position: XYPair;
	connections: ComponentConnectionList;
}

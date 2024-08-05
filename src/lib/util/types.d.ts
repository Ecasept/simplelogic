export type HandleEdge = "top" | "bottom" | "left" | "right";

export type HandleType = "input" | "output";

export type ComponentConnection = { id: number; handleId: string };
export type WireConnection = { id: number; handleType: HandleType };

export type ComponentHandleList = {
	[handleId in string]: {
		edge: HandleEdge;
		pos: number;
		type: HandleType;
		connection: WireConnection | null;
	};
};

export type WireHandle = {
	x: number;
	y: number;
	connection: WireConnection | ComponentConnection | null;
};

export type XYPair = { x: number; y: number };

interface Command {
	execute(graphData: GraphData): void | any;
	undo(graphData: GraphData): void;
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
	handles: ComponentHandleList;
}

export interface GraphData {
	wires: { [id in number]: WireData };
	components: { [id in number]: ComponentData };
	nextId: number;
}

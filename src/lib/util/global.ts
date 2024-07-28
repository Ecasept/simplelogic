import type { ComponentIOList } from "./types";

export const GRID_SIZE = 20;

export function gridSnap(val: number) {
	return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function deepCopy<Type>(val: Type): Type {
	return JSON.parse(JSON.stringify(val));
}

export const COMPONENT_IO_MAPPING: {
	[key: string]: {
		inputs: ComponentIOList;
		outputs: ComponentIOList;
		height: number;
		width: number;
	};
} = {
	AND: {
		inputs: {
			left: [
				{ type: "in1", pos: 1 },
				{ type: "in2", pos: 3 },
			],
		},
		outputs: { right: [{ type: "out", pos: 2 }] },
		height: 4,
		width: 4,
	},
	OR: {
		inputs: {
			top: [
				{ type: "in1", pos: 1 },
				{ type: "in2", pos: 3 },
			],
		},
		outputs: { bottom: [{ type: "out", pos: 2 }] },
		height: 4,
		width: 4,
	},
};

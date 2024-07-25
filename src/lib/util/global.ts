import type { ComponentIOList } from "./types";

export const GRID_SIZE = 50;

export function gridSnap(val: number) {
	return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function deepCopy<Type>(val: Type): Type {
	return JSON.parse(JSON.stringify(val));
}

export const COMPONENT_IO_MAPPING: {
	[key: string]: { inputs: ComponentIOList; outputs: ComponentIOList };
} = {
	AND: {
		inputs: { left: [{ type: "in1" }, { type: "in2" }] },
		outputs: { right: [{ type: "out" }] },
	},
	OR: {
		inputs: { top: [{ type: "in1" }, { type: "in2" }] },
		outputs: { bottom: [{ type: "out" }] },
	},
};

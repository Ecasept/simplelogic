import type { ComponentConnectionList } from "./types";

export const GRID_SIZE = 20;

export function gridSnap(val: number) {
	return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function deepCopy<Type>(val: Type): Type {
	return JSON.parse(JSON.stringify(val));
}

export const COMPONENT_IO_MAPPING: {
	[key: string]: {
		connections: ComponentConnectionList;
		height: number;
		width: number;
	};
} = {
	AND: {
		connections: {
			in1: { edge: "left", pos: 1, type: "input" },
			in2: { edge: "left", pos: 3, type: "input" },
			out: { edge: "right", pos: 2, type: "output" },
		},
		height: 4,
		width: 4,
	},
	OR: {
		connections: {
			in1: { edge: "top", pos: 1, type: "input" },
			in2: { edge: "top", pos: 3, type: "input" },
			out: { edge: "bottom", pos: 2, type: "output" },
		},
		height: 4,
		width: 4,
	},
};

export function isClickOverSidebar(e: MouseEvent) {
	const sidebar = document.querySelector(".sidebarWrapper");
	if (sidebar === null) {
		console.error("sidebar does not exist");
		return false;
	}
	const sidebarRect = sidebar.getBoundingClientRect();
	return (
		e.clientX >= sidebarRect.left &&
		e.clientX <= sidebarRect.right &&
		e.clientY >= sidebarRect.top &&
		e.clientY <= sidebarRect.bottom
	);
}

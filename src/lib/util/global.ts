import type { ComponentHandleList, HandleEdge, XYPair } from "./types";

export const GRID_SIZE = 20;

export function gridSnap(val: number) {
	return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export const COMPONENT_IO_MAPPING: {
	[key: string]: {
		connections: ComponentHandleList;
		height: number;
		width: number;
	};
} = {
	AND: {
		connections: {
			in1: { edge: "left", pos: 1, type: "input", connection: null },
			in2: { edge: "left", pos: 3, type: "input", connection: null },
			out: { edge: "right", pos: 2, type: "output", connection: null },
		},
		height: 4,
		width: 4,
	},
	OR: {
		connections: {
			in1: { edge: "top", pos: 1, type: "input", connection: null },
			in2: { edge: "top", pos: 3, type: "input", connection: null },
			out: { edge: "bottom", pos: 2, type: "output", connection: null },
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

export function calculateHandleOffset(
	handleEdge: HandleEdge,
	handlePos: number,
	componentSize: XYPair,
) {
	let pos: XYPair = { x: 0, y: 0 };
	if (["left", "right"].includes(handleEdge)) {
		pos.x = handleEdge == "right" ? GRID_SIZE * componentSize.x : 0;
		pos.y = GRID_SIZE * handlePos;
	} else {
		pos.x = GRID_SIZE * handlePos;
		pos.y = handleEdge == "bottom" ? GRID_SIZE * componentSize.y : 0;
	}
	return pos;
}

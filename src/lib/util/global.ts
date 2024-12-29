import type { ComponentHandleList, HandleEdge, XYPair } from "./types";
import { canvasViewModel } from "./actions";

export let mousePosition = { x: 0, y: 0 };
export function setMousePosition(pos: XYPair) {
	mousePosition = pos;
}

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
			in1: { edge: "left", pos: 1, type: "input", connection: null },
			in2: { edge: "left", pos: 3, type: "input", connection: null },
			out: { edge: "right", pos: 2, type: "output", connection: null },
		},
		height: 4,
		width: 4,
	},
	NOT: {
		connections: {
			in: { edge: "left", pos: 2, type: "input", connection: null },
			out: { edge: "right", pos: 2, type: "output", connection: null },
		},
		height: 4,
		width: 4,
	},
	XOR: {
		connections: {
			in1: { edge: "left", pos: 1, type: "input", connection: null },
			in2: { edge: "left", pos: 3, type: "input", connection: null },
			out: { edge: "right", pos: 2, type: "output", connection: null },
		},
		height: 4,
		width: 4,
	},
	DUPLICATE: {
		connections: {
			in: { edge: "left", pos: 2, type: "input", connection: null },
			out1: { edge: "right", pos: 1, type: "output", connection: null },
			out2: { edge: "right", pos: 3, type: "output", connection: null },
		},
		height: 4,
		width: 4,
	},
	INPUT: {
		connections: {
			out: { edge: "right", pos: 1, type: "output", connection: null },
		},
		height: 2,
		width: 2,
	},
	LED: {
		connections: {
			in: { edge: "left", pos: 1, type: "input", connection: null },
		},
		height: 2,
		width: 2,
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

export function constructComponent(label: string, type: string, pos: XYPair) {
	if (!(type in COMPONENT_IO_MAPPING)) {
		console.error(`Tried to add non-existing type ${type}`);
		return;
	}
	const data = structuredClone(COMPONENT_IO_MAPPING[type]);
	const svgPos = canvasViewModel.clientToSVGCoords(pos);
	return {
		type: type,
		label: label,
		size: { x: data.width, y: data.height },
		position: {
			x: svgPos.x - (data.width * GRID_SIZE) / 2,
			y: svgPos.y - (data.height * GRID_SIZE) / 2,
		},
		handles: data.connections,
	};
}

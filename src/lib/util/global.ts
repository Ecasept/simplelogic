import { canvasViewModel } from "./actions";
import type {
	ComponentConnection,
	ComponentData,
	ComponentHandleList,
	HandleEdge,
	WireConnection,
	XYPair,
} from "./types";

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
		handles: ComponentHandleList;
		height: number;
		width: number;
		description: string;
	};
} = {
	AND: {
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if both inputs are true",
	},
	OR: {
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if either input is true",
	},
	NOT: {
		handles: {
			in: { edge: "left", pos: 2, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs the opposite of the input",
	},
	XOR: {
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if only one input is true",
	},
	DBL: {
		handles: {
			in: { edge: "left", pos: 2, type: "input", connections: [] },
			out1: { edge: "right", pos: 1, type: "output", connections: [] },
			out2: { edge: "right", pos: 3, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs the input to two outputs",
	},
	IN: {
		handles: {
			out: { edge: "right", pos: 1, type: "output", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Toggleable power source",
	},
	LED: {
		handles: {
			in: { edge: "left", pos: 1, type: "input", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Displays the input as a light",
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

export function constructComponent(
	type: string,
	pos: XYPair,
): Omit<ComponentData, "id"> | undefined {
	if (!(type in COMPONENT_IO_MAPPING)) {
		console.error(`Tried to add non-existing type ${type}`);
		return;
	}
	const data = structuredClone(COMPONENT_IO_MAPPING[type]);
	const svgPos = canvasViewModel.clientToSVGCoords(pos);
	return {
		type: type,
		size: { x: data.width, y: data.height },
		position: {
			x: svgPos.x - (data.width * GRID_SIZE) / 2,
			y: svgPos.y - (data.height * GRID_SIZE) / 2,
		},
		handles: data.handles,
		isPoweredInitially: false,
	};
}

export function isComponentConnection(
	connection: WireConnection | ComponentConnection,
): connection is ComponentConnection {
	return "handleId" in connection;
}

export function indexOfByValue(arr: WireConnection[], value: WireConnection) {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].id === value.id && arr[i].handleType === value.handleType) {
			return i;
		}
	}
	return -1;
}

export function includesByValue(arr: WireConnection[], value: WireConnection) {
	return indexOfByValue(arr, value) !== -1;
}

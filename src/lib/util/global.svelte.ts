import { canvasViewModel, editorViewModel } from "./actions";
import type {
	ComponentConnection,
	ComponentData,
	ComponentHandleList,
	ComponentType,
	HandleEdge,
	WireConnection,
	XYPair,
} from "./types";

export let mousePosition = { x: 0, y: 0 };
export function setMousePosition(pos: XYPair) {
	mousePosition = pos;
}

/** The distance between the centers of the dots in the grid in px */
export const GRID_SIZE = 20;
/** How long a long press should be in milliseconds */
export const LONG_PRESS_MS = 500;
/** The radius of the dots constituting the canvas grid in px */
export const CANVAS_DOT_RADIUS = 1;

export function gridSnap(val: number) {
	if (editorViewModel.uiState.gridSnap) {
		return Math.round(val / GRID_SIZE) * GRID_SIZE;
	} else {
		return val;
	}
}

export const COMPONENT_DATA: {
	[T in ComponentType]: {
		handles: ComponentHandleList;
		height: number;
		width: number;
		description: string;
		canBePoweredWithoutAnyInputBeingPowered: boolean;
		execute: (
			inputs: Record<string, boolean>,
			isPoweredInitially: boolean,
			output: string,
		) => boolean;
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
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs: Record<string, boolean>, _: boolean, __: string) =>
			inputs.in1 && inputs.in2,
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
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs: Record<string, boolean>, _: boolean, __: string) =>
			inputs.in1 || inputs.in2,
	},
	NOT: {
		handles: {
			in: { edge: "left", pos: 2, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs the opposite of the input",
		canBePoweredWithoutAnyInputBeingPowered: true,
		execute: (inputs: Record<string, boolean>, _: boolean, __: string) =>
			!inputs.in,
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
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs: Record<string, boolean>, _: boolean, __: string) =>
			inputs.in1 != inputs.in2,
	},
	IN: {
		handles: {
			out: { edge: "right", pos: 1, type: "output", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Toggleable power source",
		canBePoweredWithoutAnyInputBeingPowered: true,
		execute: (
			_: Record<string, boolean>,
			isPoweredInitially: boolean,
			__: string,
		) => {
			return isPoweredInitially;
		},
	},
	LED: {
		handles: {
			in: { edge: "left", pos: 1, type: "input", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Displays the input as a light",
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs: Record<string, boolean>, _: boolean, __: string) => {
			throw new Error("Cannot execute LED");
		},
	},
};

export function calculateHandlePosition(
	componentPos: XYPair,
	handleEdge: HandleEdge,
	handlePos: number,
	componentSize: XYPair,
) {
	const offset = calculateHandleOffset(handleEdge, handlePos, componentSize);
	return {
		x: componentPos.x + offset.x,
		y: componentPos.y + offset.y,
	};
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

/** Creates a component with important data pre-filled in
 *
 * @param type The type of component to create
 * @param pos The position to create the component at, as a client position. The component will be centered around this position.
 */
export function constructComponent(
	type: ComponentType,
	pos: XYPair,
): Omit<ComponentData, "id"> {
	const data = COMPONENT_DATA[type];
	const svgPos = canvasViewModel.clientToSVGCoords(pos);
	return {
		type: type,
		size: { x: data.width, y: data.height },
		position: {
			x: svgPos.x - (data.width * GRID_SIZE) / 2,
			y: svgPos.y - (data.height * GRID_SIZE) / 2,
		},
		handles: structuredClone(data.handles),
		isPoweredInitially: false,
	};
}

export function isComponentConnection(
	connection: WireConnection | ComponentConnection | null,
): connection is ComponentConnection {
	return connection !== null && "handleId" in connection;
}

export function isWireConnection(
	connection: WireConnection | ComponentConnection | null,
): connection is WireConnection {
	return connection !== null && "handleType" in connection;
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

export function indexOfByValueMulti(
	arr: (WireConnection | ComponentConnection)[],
	value: WireConnection | ComponentConnection,
) {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].id === value.id) {
			const val = arr[i];
			if (isComponentConnection(val) && isComponentConnection(value)) {
				if (val.id === value.id && val.handleId === value.handleId) {
					return i;
				}
			} else if (isWireConnection(val) && isWireConnection(value)) {
				if (val.id === value.id && val.handleType === value.handleType) {
					return i;
				}
			}
		}
	}
	return -1;
}

export function includesByValueMulti(
	arr: (WireConnection | ComponentConnection)[],
	value: WireConnection | ComponentConnection,
) {
	return indexOfByValueMulti(arr, value) !== -1;
}

/** The Vibrate API is not available in all browsers,
 *  contrary to the typescript definition.
 *  This function checks if the vibrate function is available
 *
 *  https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1486
 */
export function isVibrateSupported(): boolean {
	return typeof navigator.vibrate === "function";
}

export function debugLog<T>(tag: string) {
	return function (type: string, value: T) {
		if (import.meta.env.DEV) {
			console.debug(tag, type, value);
		}
	};
}

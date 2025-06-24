import { canvasViewModel, editorViewModel } from "./actions";
import type {
	ComponentHandle,
	ComponentHandleList,
	ComponentHandleReference,
	ComponentType,
	EmptyHandleList,
	HandleEdge,
	HandleReference,
	ValidComponentInitData,
	WireHandleReference,
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
/** How many pixels the user has to move the mouse on the canvas before a click is considered a pan */
export const PAN_THRESHOLD = 5;

export function gridSnap(val: number) {
	if (editorViewModel.uiState.gridSnap) {
		return Math.round(val / GRID_SIZE) * GRID_SIZE;
	} else {
		return val;
	}
}

export const COMPONENT_DATA: {
	[T in ComponentType]: {
		/** The user-facing name of the component */
		name: string;
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
	} & EmptyHandleList<string, ComponentHandle>;
} = {
	AND: {
		name: "AND Gate",
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if both inputs are true",
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs, _, __) => inputs.in1 && inputs.in2,
	},
	OR: {
		name: "OR Gate",
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if either input is true",
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs, _, __) => inputs.in1 || inputs.in2,
	},
	NOT: {
		name: "NOT Gate",
		handles: {
			in: { edge: "left", pos: 2, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs the opposite of the input",
		canBePoweredWithoutAnyInputBeingPowered: true,
		execute: (inputs, _, __) => !inputs.in,
	},
	XOR: {
		name: "XOR Gate",
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 3, type: "input", connections: [] },
			out: { edge: "right", pos: 2, type: "output", connections: [] },
		},
		height: 4,
		width: 4,
		description: "Outputs true if only one input is true",
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs, _, __) => inputs.in1 != inputs.in2,
	},
	IN: {
		name: "Input",
		handles: {
			out: { edge: "right", pos: 1, type: "output", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Toggleable power source",
		canBePoweredWithoutAnyInputBeingPowered: true,
		execute: (_, isPoweredInitially, __) => {
			return isPoweredInitially;
		},
	},
	LED: {
		name: "LED",
		handles: {
			in: { edge: "left", pos: 1, type: "input", connections: [] },
		},
		height: 2,
		width: 2,
		description: "Displays the input as a light",
		canBePoweredWithoutAnyInputBeingPowered: false,
		execute: (inputs, _, __) => inputs.in,
	},
};

export function calculateHandlePosition(
	handleEdge: HandleEdge,
	handlePosOnComponent: number,
	componentSize: XYPair,
	componentPos: XYPair,
	componentRotation: number,
	rotated: boolean = true,
) {
	// Calculate offset of handlef rom the component position
	const offset = calculateHandleOffset(
		handleEdge,
		handlePosOnComponent,
		componentSize,
	);

	// Calculate actual position of handle
	const handlePos = {
		x: componentPos.x + offset.x,
		y: componentPos.y + offset.y,
	};

	if (!rotated) {
		return handlePos;
	}

	// Rotate the handle around the center of the component
	const componentCenter = {
		x: componentPos.x + (componentSize.x * GRID_SIZE) / 2,
		y: componentPos.y + (componentSize.y * GRID_SIZE) / 2,
	};

	const rotatedPos = rotateAroundBy(
		handlePos,
		componentCenter,
		componentRotation,
	);

	return rotatedPos;
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
): ValidComponentInitData {
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
		rotation: 0,
	};
}

/** Checks if the given handle reference `ref` is a reference to the handle of **a component**. */
export function isComponentHandleRef(
	ref: HandleReference | null,
): ref is ComponentHandleReference {
	return ref !== null && ref.type === "component";
}

/** Checks if the given handle reference `ref` is a reference to the handle of **a wire**. */
export function isWireHandleRef(
	ref: HandleReference | null,
): ref is WireHandleReference {
	return ref !== null && ref.type === "wire";
}

/** Returns the index of the first occurrence of a handle reference in an array of handle references.
 * This function is necessary because two handle references might be different underlying js objects,
 * and so technically not equal, but still point to the same handle.
 */
export function indexOfHandle(arr: HandleReference[], value: HandleReference) {
	for (let i = 0; i < arr.length; i++) {
		// Test if all of these properties are equal
		const vals: (keyof HandleReference)[] = [
			"id",
			"handleType",
			"handleId",
			"type",
		];
		if (vals.every((prop) => arr[i][prop] === value[prop])) {
			return i;
		}
	}
	return -1;
}

export function includesHandle(arr: HandleReference[], value: HandleReference) {
	return indexOfHandle(arr, value) !== -1;
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

type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];
/** `Object.entries` but with types */
export function entries<T extends object>(object: T): Entries<T> {
	return Object.entries(object) as Entries<T>;
}

/**
 * Animates the collapse or extension of a sidebar content element.
 *
 * @param sidebarContent The HTML element to animate
 * @param collapse Whether to collapse (true) or extend (false) the sidebar content
 * @returns An Animation object that can be used to control the animation
 */
export function collapseAnimation(
	sidebarContent: HTMLElement,
	collapse: boolean,
) {
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	const animationOptions = {
		duration: reducedMotion ? 0 : 200,
		fill: "forwards" as const,
		easing: "ease-in-out",
	};

	const collapseAnim = [
		{
			maxHeight: `${sidebarContent.scrollHeight}px`,
			opacity: 1,
		},
		{ maxHeight: "0px", opacity: 0 },
	];
	const extendAnim = [
		{ maxHeight: "0px", opacity: 0 },
		{
			maxHeight: `${sidebarContent.scrollHeight}px`,
			opacity: 1,
			offset: 1,
		},
		{ maxHeight: "none", opacity: 1, offset: 1 }, // Don't apply a max-height after the animation
	];

	if (collapse) {
		return sidebarContent.animate(collapseAnim, animationOptions);
	} else {
		return sidebarContent.animate(extendAnim, animationOptions);
	}
}

/** Returns the initial style for a collapsible element based on whether it is open or closed.
 *
 * @param open Whether element is currently open or closed
 * @returns The CSS style string to apply to the element
 */
export function collapseAnimationInit(open: boolean) {
	return `max-height: ${open ? "none" : "0px"}; opacity: ${open ? 1 : 0};`;
}

export function rotateAroundBy(
	position: XYPair,
	center: XYPair,
	angle: number,
): XYPair {
	const radians = (angle * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const dx = position.x - center.x;
	const dy = position.y - center.y;
	return {
		x: dx * cos - dy * sin + center.x,
		y: dx * sin + dy * cos + center.y,
	};
}

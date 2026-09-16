import type { GraphData, WireHandleReference, XYPair } from "./types";
import type { GraphEditTransaction } from "./graphEdit";
import type {
	TypedReference,
	ElementType,
} from "./viewModels/editorViewModel.svelte";

// ==== Edit Mode states ====
export type EditIdle = {
	kind: "idle";
};
export type EditAddingComponent = {
	kind: "addingComponent";
	/** The component being added */
	clickedElement: TypedReference;
	/** The position of the mouse when the component was created */
	clickPosition: XYPair;
	/** Whether the component was added by dragging from the component toolbar, or by using the keyboard shortcut */
	initiator: "drag" | "keyboard";
	/** The id of the pointer whose click initiated the action. `null` if initiated by keyboard */
	activePointerId: number | null;
};
export type EditAddingElements = {
	kind: "addingElements";
	activePointerId: number | null;
	/** The elements being added */
	elements: Map<number, ElementType>;
	/** The position of the mouse when the component was created */
	clickPosition: XYPair;
};

/** When the user clicked the mouse down on an element,
 * but has not yet released or moved the mouse.
 */
export type EditElementDown = {
	kind: "elementDown";
	/** The element that was clicked */
	clickedElement: TypedReference;
	/** The position of the mouse when the element was clicked */
	clickPosition: XYPair;
	/** What type of click was used */
	clickType: "ctrl" | "none";
	activePointerId: number;
};

export type EditDraggingElements = {
	kind: "draggingElements";
	/** The ID of the component being dragged */
	clickedElement: TypedReference;
	/** The position of the mouse when the elements were clicked */
	clickPosition: XYPair;
	/** Whether all selected elements are being dragged, or only the clicked one */
	draggingSelected: boolean;
	activePointerId: number;
};

export type EditWireHandleDown = {
	kind: "wireHandleDown";
	/** The wire handle that was clicked */
	clickedHandle: WireHandleReference;
	/** The position of the mouse when the handle was clicked */
	clickPosition: XYPair;
	/** The number of connections the wire has */
	connectionCount: number;
	/** What type of click was used */
	clickType: "ctrl" | "none";
	activePointerId: number;
};

export type EditDraggingWireHandle = {
	kind: "draggingWireHandle";
	clickPosition: XYPair;
	draggedHandle: WireHandleReference;
	connectionCount: number;
	activePointerId: number;
};
export type EditAddingWire = {
	kind: "addingWire";
	clickPosition: XYPair;
	draggedHandle: WireHandleReference;
	connectionCount: number;
	activePointerId: number;
};

export type EditInteraction =
	| EditIdle
	| EditElementDown
	| EditDraggingElements
	| EditAddingComponent
	| EditWireHandleDown
	| EditDraggingWireHandle
	| EditAddingWire
	| EditAddingElements;

export type PointerInput = {
	pointerId: number;
	clientX: number;
	clientY: number;
	button: number;
	shiftKey: boolean;
};

export type InteractionState =
	| EditInteraction
	| { kind: "pan" }
	| { kind: "area"; pointerId: number; startPos: XYPair; currentPos: XYPair };

export type MovementSession = { edit: GraphEditTransaction; origin: GraphData };

import { isMatching, P } from "ts-pattern";
import type { PatternConstraint } from "../../../../node_modules/ts-pattern/dist/is-matching";
import type { HandleReference, WireHandleReference, XYPair } from "../types";

/** References an element, and including its type.
 * This is useful because, even though an element can be
 * uniquely identified by its ID, many operations behave differently
 * depending on whether the element is a component or a wire, so
 * by storing the type, we can avoid having to look it up many times later.
 */
export type TypedReference = {
	id: number;
	/** The type of the selected element, either "component" or "wire" */
	type: "component" | "wire";
};
export type ElementType = "component" | "wire";

/** Base properties that are always present */
export type BaseState = {
	hoveredHandle: HandleReference | null;
	hoveredElement: number | null;
	isModalOpen: boolean;
};

export type AreaSelectType = "intersect" | "contain";

export type SettingsState = {
	/** The settings of the editor */
	settings: {
		/** Whether dragging elements should snap to the grid */
		gridSnap: boolean;
		/** Whether area selection should select elements that intersect the selection area, or only those fully contained within it */
		areaSelectType: AreaSelectType;
	}
};

// ==== Edit Mode states ====
export type EditIdle = {
	mode: "edit";
	editType: "idle";
};
export type EditAddingComponent = {
	mode: "edit";
	editType: "addingComponent";
	/** The component being added */
	clickedElement: TypedReference;
	/** The position of the mouse when the component was created */
	clickPosition: XYPair;
	/** Whether the component was added by dragging from the component toolbar, or by using the keyboard shortcut */
	initiator: "drag" | "keyboard";
};

/** When the user clicked the mouse down on an element,
 * but has not yet released or moved the mouse.
 */
export type EditElementDown = {
	mode: "edit";
	editType: "elementDown";
	/** The element that was clicked */
	clickedElement: TypedReference;
	/** The position of the mouse when the element was clicked */
	clickPosition: XYPair;
	/** What type of click was used */
	clickType: "ctrl" | "none";
};

export type EditDraggingElements = {
	mode: "edit";
	editType: "draggingElements";
	/** The ID of the component being dragged */
	clickedElement: TypedReference;
	/** The position of the mouse when the elements were clicked */
	clickPosition: XYPair;
	/** Whether all selected elements are being dragged, or only the clicked one */
	draggingSelected: boolean;
};

export type EditWireHandleDown = {
	mode: "edit";
	editType: "wireHandleDown";
	/** The wire handle that was clicked */
	clickedHandle: WireHandleReference;
	/** The position of the mouse when the handle was clicked */
	clickPosition: XYPair;
	/** The number of connections the wire has */
	connectionCount: number;
	/** What type of click was used */
	clickType: "ctrl" | "none";
};

export type EditDraggingWireHandle = {
	mode: "edit";
	editType: "draggingWireHandle";
	clickPosition: XYPair;
	draggedHandle: WireHandleReference;
	connectionCount: number;
};
export type EditAddingWire = {
	mode: "edit";
	editType: "addingWire";
	clickPosition: XYPair;
	draggedHandle: WireHandleReference;
	connectionCount: number;
};

export type EditState =
	| EditIdle
	| EditElementDown
	| EditDraggingElements
	| EditAddingComponent
	| EditWireHandleDown
	| EditDraggingWireHandle
	| EditAddingWire;

// ==== Delete Mode states ====
export type DeleteState = {
	mode: "delete";
};

// ==== Simulation Mode states ====
export type SimulationState = {
	mode: "simulate";
};

// ==== Panning states ====
export type NotPanning = {
	isPanning: false;
};
export type Panning = {
	isPanning: true;
};
export type PanningState = NotPanning | Panning;

// ==== Selection states ====
export type SelectionState = {
	selected: Map<number, ElementType>;
};

export type MatchesState = {
	matches: matcher.MatchesFunction;
};

/** States unrelated to the current mode */
export type PersistentState = BaseState &
	MatchesState &
	PanningState &
	SettingsState;

// ==== Editor state ====
export type EditorUiState = (
	| (EditState & SelectionState)
	| DeleteState
	| SimulationState
) &
	PersistentState;

export namespace matcher {
	/** Ensures that UI state matches a given pattern
	 * @param pattern The pattern to match against
	 * @returns Whether the UI state matches the pattern
	 *
	 * @example
	 * ```ts
	 * if (uiState.matches({ mode: "edit" })) {
	 *     // uiState is guaranteed to be in edit mode
	 *     console.log(uiState.editType); // no error
	 * }
	 * ```
	 */
	export function matches<
		const Pattern extends PatternConstraint<EditorUiState>,
	>(this: EditorUiState, pattern: Pattern): this is P.infer<Pattern> {
		// Call ts-pattern's `isMatching` function with the UI state (`this`) and the provided pattern
		return isMatching(pattern, this);
	}

	export type MatchesFunction = typeof matches;
}

// ==== Helper types ====
type DistributiveOmit<T, K extends keyof any> = T extends any
	? Omit<T, K>
	: never;

/** Creates a deep clone of the state, but does not clone the `matches` function */
function makeUiStateClone(state: EditorUiState): EditorUiState {
	const { matches, ...rest } = state;
	const deepClone = structuredClone(rest); // create a deep clone
	return { ...deepClone, matches };
}

export class EditorViewModel {
	private initialUiState: EditorUiState = {
		mode: "edit",
		editType: "idle",
		selected: new Map<number, ElementType>(),
		hoveredHandle: null,
		hoveredElement: null,
		isModalOpen: false,
		isPanning: false,
		// Default settings, might be overridden through local storage later
		settings: {
			gridSnap: true,
			areaSelectType: "intersect",
		},
		matches: matcher.matches,
	};

	private _uiState: EditorUiState = makeUiStateClone(this.initialUiState);
	public uiState: EditorUiState = $state(makeUiStateClone(this._uiState));

	private notifyAll() {
		// Update exposed state rune
		this.uiState = makeUiStateClone(this._uiState);
	}

	/** Sets the UI state, preserving the persistent state.
	 * Properties not provided will be deleted (except for persistent properties).
	 */
	private setUiState(
		newState: DistributiveOmit<EditorUiState, keyof PersistentState>,
	) {
		const persistent: PersistentState = {
			hoveredHandle: this._uiState.hoveredHandle,
			hoveredElement: this._uiState.hoveredElement,
			isModalOpen: this._uiState.isModalOpen,
			isPanning: this._uiState.isPanning,
			settings: this._uiState.settings,
			matches: this._uiState.matches,
		};
		this._uiState = { ...persistent, ...newState };
	}

	/** Returns the currently selected elements, or a new empty set if none are selected. */
	private getSelected() {
		return "selected" in this._uiState
			? this._uiState.selected
			: new Map<number, ElementType>();
	}

	private softReset() {
		this._uiState = {
			mode: "edit",
			editType: "idle",
			selected: this.getSelected(), // Preserve selected element
			hoveredHandle: this._uiState.hoveredHandle,
			hoveredElement: this._uiState.hoveredElement,
			isModalOpen: this._uiState.isModalOpen,
			settings: this._uiState.settings,
			isPanning: false,
			matches: this._uiState.matches,
		};
		this.notifyAll();
	}

	/** Completely resets the editor, as if the page was loaded again */
	hardReset() {
		this._uiState = makeUiStateClone(this.initialUiState);
		this.notifyAll();
	}

	/** Aborts any editing (eg. moving or adding wires/components) currently in progress,
	 * but preserves eg. if you are in delete/simulate mode */
	abortEditing() {
		if (this._uiState.matches({ mode: "edit" })) {
			this.softReset();
		}
	}

	switchToEditMode() {
		this.setUiState({
			mode: "edit",
			editType: "idle",
			selected: this.getSelected(),
		});
		this.notifyAll();
	}
	switchToDeleteMode() {
		this.setUiState({
			mode: "delete",
		});
		this.notifyAll();
	}
	switchToSimulationMode() {
		this.setUiState({
			mode: "simulate",
		});
		this.notifyAll();
	}

	/** Puts the editor into the state where an element has been clicked,
	 * and we are waiting for further actions by the user.
	 * @param clicked The element that was clicked
	 * @param pos The svg position where the mouse clicked
	 * @param clickType The type of click that was used, either "ctrl" (for ctrl-click) or "none" (for normal click)
	 */
	onElementDown(
		clicked: TypedReference,
		pos: XYPair,
		clickType: "ctrl" | "none",
	) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to click an element in an invalid mode");
			return;
		}
		this.setUiState({
			mode: "edit",
			editType: "elementDown",
			clickedElement: clicked,
			clickPosition: pos,
			clickType,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	onWireHandleDown(
		handle: WireHandleReference,
		pos: XYPair,
		connectionCount: number,
		clickType: "ctrl" | "none",
	) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to click a wire handle in an invalid mode");
			return;
		}
		this.setUiState({
			mode: "edit",
			editType: "wireHandleDown",
			clickedHandle: handle,
			clickPosition: pos,
			connectionCount,
			clickType,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	/** Starts dragging elements
	 *
	 * @param clicked The element being dragged
	 * @param pos The svg position where dragging started
	 * @param dragSelected Whether to drag all selected elements, or just the clicked one
	 */
	startDrag(clicked: TypedReference, pos: XYPair, dragSelected: boolean) {
		this.setUiState({
			mode: "edit",
			editType: "draggingElements",
			clickedElement: clicked,
			clickPosition: pos,
			draggingSelected: dragSelected,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	startDragWireHandle(
		handle: WireHandleReference,
		pos: XYPair,
		connectionCount: number,
	) {
		if (
			!this._uiState.matches({
				editType: "wireHandleDown",
			})
		) {
			console.warn("Tried to drag wire handle without it being down");
			return;
		}
		this.setUiState({
			mode: "edit",
			editType: "draggingWireHandle",
			draggedHandle: handle,
			clickPosition: pos,
			connectionCount: connectionCount,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	/** Puts the editor in the mode where a new component is being added.
	 * @param component The component that is being added
	 * @param pos The position where the mouse was clicked
	 * @param initiator Whether the component was added by dragging from the component toolbar, or by using the keyboard shortcut
	 */
	startAddComponent(
		component: TypedReference,
		pos: XYPair,
		initiator: "drag" | "keyboard",
	) {
		this.setUiState({
			mode: "edit",
			editType: "addingComponent",
			clickedElement: component,
			clickPosition: pos,
			initiator: initiator,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	startAddWire(
		wire: WireHandleReference,
		pos: XYPair,
		wireConnectionCount: number,
	) {
		this.setUiState({
			mode: "edit",
			editType: "addingWire",
			clickPosition: pos,
			draggedHandle: wire,
			connectionCount: wireConnectionCount,
			selected: this.getSelected(),
		});
		this.notifyAll();
	}

	// ==== Persistent state setters ====
	setModalOpen(val: boolean) {
		this._uiState.isModalOpen = val;
		this.notifyAll();
	}

	setHoveredElement(id: number) {
		this._uiState.hoveredElement = id;
		this.notifyAll();
	}

	removeHoveredElement() {
		this._uiState.hoveredElement = null;
		this.notifyAll();
	}
	setHoveredHandle(handle: HandleReference) {
		if (this._uiState.hoveredHandle !== null) {
			console.warn("hovered handle already set");
		}
		this._uiState.hoveredHandle = handle;
		this.notifyAll();
	}
	removeHoveredHandle() {
		this._uiState.hoveredHandle = null;
		this.notifyAll();
	}
	startAreaSelection() {
		this.startPanning();
	}
	stopAreaSelection() {
		this.stopPanning();
	}
	startPanning() {
		this._uiState.isPanning = true;
		this.notifyAll();
	}
	stopPanning() {
		this._uiState.isPanning = false;
		this.notifyAll();
	}
	/** Add `element` to the selection */
	addSelected(element: TypedReference) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to select an element in an invalid mode");
			return;
		}
		this._uiState.selected.set(element.id, element.type);
		this.notifyAll();
	}
	/** Remove `element` from the selection */
	removeSelected(element: TypedReference) {
		this.removeSelectedId(element.id);
	}
	/** Remove the element with the given `id` from the selection */
	removeSelectedId(id: number) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to deselect an element in an invalid mode");
			return;
		}
		this._uiState.selected.delete(id);
		this.notifyAll();
	}
	/** Set the selection to only contain the given element */
	setSelected(element: TypedReference) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this._uiState.selected = new Map<number, ElementType>();
		this._uiState.selected.set(element.id, element.type);
		this.notifyAll();
	}
	/** Set the selection to only contain the given elements */
	setSelectedElements(elements: TypedReference[]) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this._uiState.selected = new Map<number, ElementType>();
		for (const element of elements) {
			this._uiState.selected.set(element.id, element.type);
		}
		this.notifyAll();
	}
	clearSelection() {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to clear selection in an invalid mode");
			return;
		}
		this._uiState.selected.clear();
		this.notifyAll();
	}
	isSelected(element: TypedReference) {
		return this.isSelectedId(element.id);
	}
	isSelectedId(id: number) {
		// Use the public version of the state to ensure reactivity
		return "selected" in this.uiState && this.uiState.selected.has(id);
	}
	getSelectedCount() {
		return "selected" in this.uiState ? this.uiState.selected.size : 0;
	}
	setGridSnap(val: boolean) {
		this._uiState.settings.gridSnap = val;
		this.updateSettings();
	}
	setAreaSelectType(val: AreaSelectType) {
		this._uiState.settings.areaSelectType = val;
		this.updateSettings();
	}
	updateSettings() {
		localStorage.setItem(
			"editorSettings",
			JSON.stringify(this._uiState.settings),
		);
		this.notifyAll();
	}
	applySettings(settings: Partial<SettingsState["settings"]>) {
		this._uiState.settings = { ...this._uiState.settings, ...settings };
		this.notifyAll();
	}
}

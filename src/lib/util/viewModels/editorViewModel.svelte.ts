import { isMatching, P } from "ts-pattern";
import type { PatternConstraint } from "../../../../node_modules/ts-pattern/dist/is-matching";
import type { HandleReference, WireHandleReference, XYPair } from "../types";

// Base properties that are always present
export type BaseState = {
	hoveredHandle: HandleReference | null;
	hoveredElement: number | null;
	isModalOpen: boolean;
};

export type SettingsState = {
	/** Whether dragging elements should snap to the grid */
	gridSnap: boolean;
};

// ==== Edit Mode states ====
export type EditIdle = {
	mode: "edit";
	editType: "idle";
};
export type EditAddingComponent = {
	mode: "edit";
	editType: "addingComponent";
	componentId: number;
	/** Offset from the top left corner of the component to the mouse position in svg coordinates */
	clickOffset: XYPair;
	/** Whether the component was added by dragging from the component toolbar, or by using the keyboard shortcut */
	initiator: "drag" | "keyboard";
};
export type EditDraggingComponent = {
	mode: "edit";
	editType: "draggingComponent";
	componentId: number;
	/** If the component has actually been moved enough that
	 * it changed position on the grid */
	hasMoved: boolean;
	/** Offset from the top left corner of the component to the mouse position in svg coordinates */
	clickOffset: XYPair;
};
export type EditDraggingWire = {
	mode: "edit";
	editType: "draggingWire";
	draggedHandle: WireHandleReference;
	connectionCount: number;
	/** If the wire has actually been moved */
	hasMoved: boolean;
};
export type EditAddingWire = {
	mode: "edit";
	editType: "addingWire";
	draggedHandle: WireHandleReference;
	connectionCount: number;
};
/** The ui state when the user is dragging a wire from the middle of an existing wire */
export type EditDraggingWireMiddle = {
	mode: "edit";
	editType: "draggingWireMiddle";
	wireId: number;
	/** If the wire has actually been moved */
	hasMoved: boolean;
};

export type EditState =
	| EditIdle
	| EditAddingComponent
	| EditDraggingComponent
	| EditDraggingWire
	| EditAddingWire
	| EditDraggingWireMiddle;

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
	selected: number | null;
	/** The ID of the component/wire that wants to be selected after the next edit operation */
	selectionInProgressFor: number | null;
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
		selected: null,
		selectionInProgressFor: null,
		hoveredHandle: null,
		hoveredElement: null,
		isModalOpen: false,
		isPanning: false,
		gridSnap: true,
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
			gridSnap: this._uiState.gridSnap,
			matches: this._uiState.matches,
		};
		this._uiState = { ...persistent, ...newState };
	}

	/** Returns the currently selected element, or null if nothing is selected */
	private getSelected() {
		return "selected" in this._uiState ? this._uiState.selected : null;
	}

	private softReset() {
		this._uiState = {
			mode: "edit",
			editType: "idle",
			selected: this.getSelected(), // Preserve selected element
			selectionInProgressFor: null, // Don't preserve any element that wanted to change the selection
			hoveredHandle: this._uiState.hoveredHandle,
			hoveredElement: this._uiState.hoveredElement,
			isModalOpen: this._uiState.isModalOpen,
			gridSnap: this._uiState.gridSnap,
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
			selectionInProgressFor: null,
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

	startDragWireMiddle(wireId: number) {
		this.setUiState({
			mode: "edit",
			editType: "draggingWireMiddle",
			wireId: wireId,
			hasMoved: false,
			selected: this.getSelected(),
			selectionInProgressFor: wireId,
		});
		this.notifyAll();
	}

	/* Starts dragging a component
	 *
	 * @param id The ID of the component being dragged
	 * @param clickOffset The offset from the top left corner of the component to the mouse position in SVG coordinates
	 */
	startMoveComponent(id: number, clickOffset: XYPair) {
		this.setUiState({
			mode: "edit",
			editType: "draggingComponent",
			componentId: id,
			clickOffset: clickOffset,
			hasMoved: false,
			selected: this.getSelected(),
			selectionInProgressFor: id,
		});
		this.notifyAll();
	}
	/* Tells the editor that a component/wire that is being dragged has actually been moved */
	registerMove() {
		if (
			!this._uiState.matches({
				editType: P.union("draggingComponent", "draggingWire"),
			})
		) {
			console.warn("Tried to register move without starting it");
			return;
		}
		this._uiState.hasMoved = true;
		this.notifyAll();
	}
	startMoveWire(wire: WireHandleReference, wireConnectionCount: number) {
		this.setUiState({
			mode: "edit",
			editType: "draggingWire",
			draggedHandle: wire,
			connectionCount: wireConnectionCount,
			hasMoved: false,
			selected: this.getSelected(),
			selectionInProgressFor: wire.id,
		});
		this.notifyAll();
	}
	startAddComponent(
		id: number,
		clickOffset: XYPair,
		initiator: "drag" | "keyboard",
	) {
		this.setUiState({
			mode: "edit",
			editType: "addingComponent",
			componentId: id,
			clickOffset: clickOffset,
			initiator: initiator,
			selected: this.getSelected(),
			selectionInProgressFor: id,
		});
		this.notifyAll();
	}
	startAddWire(wire: WireHandleReference, wireConnectionCount: number) {
		this.setUiState({
			mode: "edit",
			editType: "addingWire",
			draggedHandle: wire,
			connectionCount: wireConnectionCount,
			selected: this.getSelected(),
			selectionInProgressFor: wire.id,
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
	startPanning() {
		this._uiState.isPanning = true;
		this.notifyAll();
	}
	stopPanning() {
		this._uiState.isPanning = false;
		this.notifyAll();
	}
	setSelected(id: number) {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to select an element in an invalid mode");
			return;
		}
		this._uiState.selected = id;
		this.notifyAll();
	}
	clearSelection() {
		if (!this._uiState.matches({ mode: "edit" })) {
			console.warn("Tried to clear selection in an invalid mode");
			return;
		}
		this._uiState.selected = null;
		this.notifyAll();
	}
	setGridSnap(val: boolean) {
		this._uiState.gridSnap = val;
		this.notifyAll();
	}
}

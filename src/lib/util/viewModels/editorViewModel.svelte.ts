import { isMatching, P } from "ts-pattern";
import type { PatternConstraint } from "../../../../node_modules/ts-pattern/dist/is-matching";
import type { ComponentConnection, WireConnection, XYPair } from "../types";

// Base properties that are always present
export type BaseState = {
	hoveredHandle: WireConnection | ComponentConnection | null;
	hoveredElement: number | null;
	isModalOpen: boolean;
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
	clickOffset: XYPair;
	/** Whether the component was added by dragging from the component toolbar, or by using the keyboard shortcut */
	initiator: "drag" | "keyboard";
};
export type EditDraggingComponent = {
	mode: "edit";
	editType: "draggingComponent";
	componentId: number;
	clickOffset: XYPair;
};
export type EditDraggingWire = {
	mode: "edit";
	editType: "draggingWire";
	draggedHandle: WireConnection;
	connectionCount: number;
};
export type EditAddingWire = {
	mode: "edit";
	editType: "addingWire";
	draggedHandle: WireConnection;
	connectionCount: number;
};

export type EditState =
	| EditIdle
	| EditAddingComponent
	| EditDraggingComponent
	| EditDraggingWire
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
	selected: number | null;
};

// ==== Editor state ====
export type EditorUiState = (
	| (EditState & SelectionState)
	| DeleteState
	| (SimulationState & SelectionState)
) &
	BaseState &
	PanningState & {
		matches: matcher.MatchesFunction;
	};

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
/** Properties that are always present in the UI state */
export type PersistentProperties =
	| keyof BaseState
	| "matches"
	| keyof PanningState;
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
		hoveredHandle: null,
		hoveredElement: null,
		isModalOpen: false,
		isPanning: false,
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
		newState: DistributiveOmit<EditorUiState, PersistentProperties>,
	) {
		const persistent = {
			hoveredHandle: this._uiState.hoveredHandle,
			hoveredElement: this._uiState.hoveredElement,
			isModalOpen: this._uiState.isModalOpen,
			isPanning: this._uiState.isPanning,
			matches: this._uiState.matches,
		};
		this._uiState = { ...persistent, ...newState };
	}

	private softReset() {
		this._uiState = {
			mode: "edit",
			editType: "idle",
			selected: null,
			hoveredHandle: this._uiState.hoveredHandle,
			hoveredElement: this._uiState.hoveredElement,
			isModalOpen: this._uiState.isModalOpen,
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
			selected: "selected" in this._uiState ? this._uiState.selected : null,
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
			selected: "selected" in this._uiState ? this._uiState.selected : null,
		});
		this.notifyAll();
	}

	startMoveComponent(id: number, clickOffset: XYPair) {
		this.setUiState({
			mode: "edit",
			editType: "draggingComponent",
			componentId: id,
			clickOffset: clickOffset,
			selected: id,
		});
		this.notifyAll();
	}
	startMoveWire(wire: WireConnection, wireConnectionCount: number) {
		this.setUiState({
			mode: "edit",
			editType: "draggingWire",
			draggedHandle: wire,
			connectionCount: wireConnectionCount,
			selected: wire.id,
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
			selected: id,
		});
		this.notifyAll();
	}
	startAddWire(wire: WireConnection, wireConnectionCount: number) {
		this.setUiState({
			mode: "edit",
			editType: "addingWire",
			draggedHandle: wire,
			connectionCount: wireConnectionCount,
			selected: wire.id,
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
	setHoveredHandle(handle: WireConnection | ComponentConnection) {
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
		if (!this._uiState.matches({ mode: P.union("edit", "simulate") })) {
			console.warn("Tried to select an element in an invalid mode");
			return;
		}
		this._uiState.selected = id;
		this.notifyAll();
	}
	clearSelection() {
		if (!this._uiState.matches({ mode: P.union("edit", "simulate") })) {
			console.warn("Tried to clear selection in an invalid mode");
			return;
		}
		this._uiState.selected = null;
		this.notifyAll();
	}
}

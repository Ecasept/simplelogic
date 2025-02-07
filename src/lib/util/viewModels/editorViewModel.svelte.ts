import type { ComponentConnection, WireConnection, XYPair } from "../types";

type EditComponent = {
	editMode: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
	prevState: null;
};
type EditWire = {
	editMode: "add" | "move";
	draggedWire: WireConnection;
	hoveredHandle: WireConnection | ComponentConnection | null;
	draggedWireConnectionCount: number;

	editedId: null;
	clickOffset: null;
	prevState: null;
};
type PanningState = {
	editMode: "pan";
	prevState: EditorUiState;

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};
type DeletionState = {
	editMode: "delete";
	hoveredHandle: WireConnection | ComponentConnection | null;

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	draggedWireConnectionCount: null;
	prevState: null;
};

type SimulationState = {
	editMode: "simulate";
	hoveredHandle: WireConnection | ComponentConnection | null;

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	draggedWireConnectionCount: null;
	prevState: null;
};

type DefaultState = {
	editMode: null;
	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: WireConnection | ComponentConnection | null;
	draggedWireConnectionCount: null;
	prevState: null;
};

export type EditorUiState = (
	| EditComponent
	| EditWire
	| DefaultState
	| DeletionState
	| SimulationState
	| PanningState
) & {
	isModalOpen: boolean;
	hoveredElement: number | null;
};

export class EditorViewModel {
	private initialUiState = {
		editMode: null,
		isModalOpen: false,
		hoveredHandle: null,
		clickOffset: null,
		editedId: null,
		draggedWire: null,
		hoveredElement: null,
		draggedWireConnectionCount: null,
		prevState: null,
	};

	private _uiState: EditorUiState = structuredClone(this.initialUiState);
	public uiState: EditorUiState = $state(structuredClone(this._uiState));

	private notifyAll() {
		// Update exposed state rune
		this.uiState = structuredClone(this._uiState);
	}

	private softReset() {
		this._uiState = {
			editMode: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: this._uiState.hoveredHandle,
			clickOffset: null,
			editedId: null,
			draggedWire: null,
			hoveredElement: this._uiState.hoveredElement,
			draggedWireConnectionCount: null,
			prevState: null,
		};
		this.notifyAll();
	}

	/** Completely resets the editor, as if the page was loaded again */
	hardReset() {
		this._uiState = structuredClone(this.initialUiState);
		this.notifyAll();
	}

	/** Aborts any editing (eg. moving or adding wires/components) currently in progress,
	 * but preserves eg. if you are in delete/simulate mode */
	abortEditing() {
		if (this._uiState.editMode === "add" || this._uiState.editMode === "move") {
			this.softReset();
		}
	}

	setEditMode(mode: "delete" | "simulate" | null) {
		this._uiState = {
			editMode: mode,
			editedId: null,
			clickOffset: null,
			draggedWire: null,
			draggedWireConnectionCount: null,
			hoveredHandle: this._uiState.hoveredHandle,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
			prevState: null,
		};
		this.notifyAll();
	}

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

	startMoveComponent(id: number, clickOffset: XYPair) {
		this._uiState = {
			editMode: "move",
			editedId: id,
			clickOffset: clickOffset,
			draggedWireConnectionCount: null,
			hoveredHandle: null,
			draggedWire: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
			prevState: null,
		};
		this.notifyAll();
	}
	startMoveWire(wire: WireConnection, wireConnectionCount: number) {
		this._uiState = {
			editMode: "move",
			draggedWire: wire,
			draggedWireConnectionCount: wireConnectionCount,
			hoveredHandle: null,
			clickOffset: null,
			editedId: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
			prevState: null,
		};
		this.notifyAll();
	}
	startAddComponent(id: number, clickOffset: XYPair) {
		this._uiState = {
			editMode: "add",
			editedId: id,
			clickOffset: clickOffset,
			draggedWireConnectionCount: null,
			hoveredHandle: null,
			draggedWire: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
			prevState: null,
		};
		this.notifyAll();
	}
	startAddWire(wire: WireConnection, wireConnectionCount: number) {
		this._uiState = {
			editMode: "add",
			draggedWire: wire,
			draggedWireConnectionCount: wireConnectionCount,
			editedId: null,
			hoveredHandle: null,
			clickOffset: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
			prevState: null,
		};
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
		// Save the current state so we can return to it later
		this._uiState = {
			editMode: "pan",
			prevState: structuredClone(this._uiState),
			editedId: null,
			clickOffset: null,
			draggedWire: null,
			hoveredHandle: null,
			draggedWireConnectionCount: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredElement: this._uiState.hoveredElement,
		};
		this.notifyAll();
	}
	stopPanning() {
		if (this._uiState.editMode !== "pan") {
			return;
		}
		// Restore the previous state
		// eg. if we were in delete mode before panning, we should return to delete mode
		this._uiState = this._uiState.prevState;
		this.notifyAll();
	}
}

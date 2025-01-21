import type { ComponentConnection, WireConnection, XYPair } from "../types";
import { ViewModel } from "./viewModel";

type EditComponent = {
	editMode: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};
type EditWire = {
	editMode: "add" | "move";
	draggedWire: WireConnection;
	hoveredHandle: WireConnection | ComponentConnection | null;
	draggedWireConnectionCount: number;

	editedId: null;
	clickOffset: null;
};

type DeletionState = {
	editMode: "delete";

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};

type SimulationState = {
	editMode: "simulate";

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};

type DefaultState = {
	editMode: null;
	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: WireConnection | ComponentConnection | null;
	draggedWireConnectionCount: null;
};

export type EditorUiState = (
	| EditComponent
	| EditWire
	| DefaultState
	| DeletionState
	| SimulationState
) & {
	isModalOpen: boolean;
	hoveredElement: number | null;
};

export class EditorViewModel extends ViewModel<EditorUiState> {
	private initialUiState = {
		editMode: null,
		isModalOpen: false,
		hoveredHandle: null,
		clickOffset: null,
		editedId: null,
		draggedWire: null,
		hoveredElement: null,
		draggedWireConnectionCount: null,
	};

	protected _uiState: EditorUiState = structuredClone(this.initialUiState);

	protected resetUiState() {
		throw new Error("Method not implemented.");
	}

	private softReset() {
		this._uiState = {
			editMode: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			clickOffset: null,
			editedId: null,
			draggedWire: null,
			hoveredElement: this._uiState.hoveredElement,
			draggedWireConnectionCount: null,
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

	setDelete(mode: "delete" | null) {
		this._uiState.editMode = mode;
		this.notifyAll();
	}

	setSimulate(mode: "simulate" | null) {
		this._uiState.editMode = mode;
		this.notifyAll();
	}

	setModalOpen(val: boolean) {
		this._uiState.isModalOpen = val;
		this.notifyAll();
	}

	setHovered(id: number) {
		this._uiState.hoveredElement = id;
		this.notifyAll();
	}

	removeHovered() {
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
}

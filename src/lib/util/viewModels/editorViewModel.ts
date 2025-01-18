import type { ComponentConnection, WireConnection, XYPair } from "../types";
import { ViewModel } from "./viewModel";

type EditComponent = {
	editType: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	draggedWire: null;
	hoveredHandle: null;
};
type EditWire = {
	editType: "add" | "move";
	draggedWire: WireConnection;
	hoveredHandle: WireConnection | ComponentConnection | null;

	editedId: null;
	clickOffset: null;
};

type DeletionState = {
	editType: "delete";
	editedId: number | null;

	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
};

type SimulationState = {
	editType: "simulate";

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
};

type DefaultState = {
	editType: null;
	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: WireConnection | ComponentConnection | null;
};

export type EditorUiState = (
	| EditComponent
	| EditWire
	| DefaultState
	| DeletionState
	| SimulationState
) & {
	isModalOpen: boolean;
	hoveredHandle: WireConnection | ComponentConnection | null;
};

export class EditorViewModel extends ViewModel<EditorUiState> {
	protected _uiState: EditorUiState = {
		editType: null,
		isModalOpen: false,
		hoveredHandle: null,
		clickOffset: null,
		editedId: null,
		draggedWire: null,
	};

	protected resetUiState() {
		this._uiState = {
			editType: null,
			isModalOpen: false,
			hoveredHandle: null,
			clickOffset: null,
			editedId: null,
			draggedWire: null,
		};
	}

	reset() {
		this.resetUiState();
		this.notifyAll();
	}

	setDelete(mode: "delete" | null) {
		this._uiState.editType = mode;
		this.notifyAll();
	}

	setSimulate(mode: "simulate" | null) {
		this._uiState.editType = mode;
		this.notifyAll();
	}

	setModalOpen(val: boolean) {
		this._uiState.isModalOpen = val;
		this.notifyAll();
	}

	setForDeletion(id: number) {
		if (this._uiState.editType == "delete") {
			this._uiState.editedId = id;
			this.notifyAll();
		}
	}

	removeForDeletion() {
		if (this._uiState.editType == "delete") {
			this._uiState.editedId = null;
			this.notifyAll();
		}
	}

	startMoveComponent(id: number, clickOffset: XYPair) {
		this._uiState = {
			editType: "move",
			editedId: id,
			clickOffset: clickOffset,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			draggedWire: null,
		};
		this.notifyAll();
	}
	startMoveWire(wire: WireConnection) {
		this._uiState = {
			editType: "move",
			editedId: null,
			draggedWire: wire,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			clickOffset: null,
		};
		this.notifyAll();
	}
	startAddComponent(id: number, clickOffset: XYPair) {
		this._uiState = {
			editType: "add",
			editedId: id,
			clickOffset: clickOffset,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			draggedWire: null,
		};
		this.notifyAll();
	}
	startAddWire(wire: WireConnection) {
		this._uiState = {
			editType: "add",
			editedId: null,
			draggedWire: wire,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			clickOffset: null,
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

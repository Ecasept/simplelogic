import type { ComponentConnection, WireConnection, XYPair } from "../types";
import { ViewModel } from "./viewModel";

type EditComponent = {
	editType: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};
type EditWire = {
	editType: "add" | "move";
	draggedWire: WireConnection;
	hoveredHandle: WireConnection | ComponentConnection | null;
	draggedWireConnectionCount: number;

	editedId: null;
	clickOffset: null;
};

type DeletionState = {
	editType: "delete";

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};

type SimulationState = {
	editType: "simulate";

	editedId: null;
	clickOffset: null;
	draggedWire: null;
	hoveredHandle: null;
	draggedWireConnectionCount: null;
};

type DefaultState = {
	editType: null;
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
	protected _uiState: EditorUiState = {
		editType: null,
		isModalOpen: false,
		hoveredHandle: null,
		clickOffset: null,
		editedId: null,
		draggedWire: null,
		hoveredElement: null,
		draggedWireConnectionCount: null,
	};

	protected resetUiState() {
		this._uiState = {
			editType: null,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			clickOffset: null,
			editedId: null,
			draggedWire: null,
			hoveredElement: this._uiState.hoveredElement,
			draggedWireConnectionCount: null,
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
			editType: "move",
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
			editType: "move",
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
			editType: "add",
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
			editType: "add",
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

import type { HandleClientError } from "@sveltejs/kit";
import type {
	ComponentConnection,
	HandleType,
	WireConnection,
	XYPair,
} from "../types";
import { ViewModel } from "./viewModel";

type EditComponent = {
	editType: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	outputConnectedToWire: false;
	draggedHandle: null;
};
type EditWire = {
	editType: "add" | "move";
	editedId: number;
	draggedHandle: HandleType;
	outputConnectedToWire: boolean;

	clickOffset: null;
};

type DeletionState = {
	editType: "delete";
	editedId: number | null;

	draggedHandle: null;
	clickOffset: null;
	outputConnectedToWire: false;
};

type SimulationState = {
	editType: "simulate";

	editedId: null;
	draggedHandle: null;
	clickOffset: null;
	outputConnectedToWire: false;
};

type DefaultState = {
	editType: null;
	editedId: null;
	draggedHandle: null;
	clickOffset: null;
	outputConnectedToWire: false;
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
		draggedHandle: null,
		editedId: null,
		outputConnectedToWire: false,
	};

	protected resetUiState() {
		this._uiState = {
			editType: null,
			isModalOpen: false,
			hoveredHandle: null,
			clickOffset: null,
			draggedHandle: null,
			editedId: null,
			outputConnectedToWire: false,
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
			draggedHandle: null,
			outputConnectedToWire: false,
		};
		this.notifyAll();
	}
	startMoveWire(
		id: number,
		outputConnectedToWire: boolean,
		draggedHandle: HandleType,
	) {
		this._uiState = {
			editType: "move",
			editedId: id,
			draggedHandle: draggedHandle,
			isModalOpen: this._uiState.isModalOpen,
			outputConnectedToWire: outputConnectedToWire,
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
			draggedHandle: null,
			outputConnectedToWire: false,
		};
		this.notifyAll();
	}
	startAddWire(id: number, draggedHandle: HandleType) {
		this._uiState = {
			editType: "add",
			editedId: id,
			draggedHandle: draggedHandle,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			clickOffset: null,
			outputConnectedToWire: false,
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

import type { HandleClientError } from "@sveltejs/kit";
import type {
	ComponentConnection,
	HandleType,
	WireConnection,
	XYPair,
} from "../types";
import { ViewModel } from "./viewModel";

// doing nothing
// adding component: with clickoffset
// moving component: with clickoffset
// adding wire: with draggedwire and hoveredhandle
// moving wire: with draggedwire and hoveredhandle

type EditComponent = {
	editType: "add" | "move";
	editedId: number;
	clickOffset: XYPair;

	draggedHandle: null;
};
type EditWire = {
	editType: "add" | "move";
	editedId: number;
	draggedHandle: HandleType;

	clickOffset: null;
};
type DefaultState = {
	editType: null;
	editedId: null;
	draggedHandle: null;
	clickOffset: null;
};

export type EditorUiState = (EditComponent | EditWire | DefaultState) & {
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
	};

	protected resetUiState() {
		this._uiState = {
			editType: null,
			isModalOpen: false,
			hoveredHandle: null,
			clickOffset: null,
			draggedHandle: null,
			editedId: null,
		};
	}

	reset() {
		this.resetUiState();
		this.notifyAll();
	}

	setModalOpen(val: boolean) {
		this._uiState.isModalOpen = val;
		this.notifyAll();
	}

	startMoveComponent(id: number, clickOffset: XYPair) {
		this._uiState = {
			editType: "move",
			editedId: id,
			clickOffset: clickOffset,
			isModalOpen: this._uiState.isModalOpen,
			hoveredHandle: null,
			draggedHandle: null,
		};
		this.notifyAll();
	}
	startMoveWire(id: number, draggedHandle: HandleType) {
		this._uiState = {
			editType: "move",
			editedId: id,
			draggedHandle: draggedHandle,
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
			draggedHandle: null,
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
		};
		this.notifyAll();
	}
	setHoveredHandle(handle: WireConnection | ComponentConnection) {
		console.log("enter");
		if (this._uiState.hoveredHandle !== null) {
			console.warn("hovered handle already set");
		}
		this._uiState.hoveredHandle = handle;
		this.notifyAll();
	}
	removeHoveredHandle() {
		console.log("leave");
		this._uiState.hoveredHandle = null;
		this.notifyAll();
	}
}

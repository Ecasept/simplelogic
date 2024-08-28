import type { HandleType, XYPair } from "../types";
import { ViewModel } from "./viewModel";

export type EditorUiState = {
	isModalOpen: boolean;
} & (
	| ({
			state: "add" | "move";
			id: number;
	  } & (
			| { draggedHandle: HandleType; clickOffset: null }
			| { draggedHandle: null; clickOffset: XYPair }
	  ))
	| { state: null; id: null; clickOffset: null; draggedHandle: null }
);

export class EditorViewModel extends ViewModel<EditorUiState> {
	protected _uiState: EditorUiState = {
		state: null,
		id: null,
		draggedHandle: null,
		isModalOpen: false,
		clickOffset: null,
	};

	protected resetUiState() {
		this._uiState = {
			state: null,
			id: null,
			draggedHandle: null,
			isModalOpen: false,
			clickOffset: null,
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
		this._uiState.state = "move";
		this._uiState.id = id;
		this._uiState.clickOffset = clickOffset;
		this.notifyAll();
	}
	startMoveWire(id: number, draggedHandle: HandleType) {
		this._uiState.state = "move";
		this._uiState.id = id;
		this._uiState.draggedHandle = draggedHandle;
		this.notifyAll();
	}
	startAddComponent(id: number, clickOffset: XYPair) {
		this._uiState.state = "add";
		this._uiState.id = id;
		this._uiState.clickOffset = clickOffset;
		this.notifyAll();
	}
	startAddWire(id: number, draggedHandle: HandleType) {
		this._uiState.state = "move";
		this._uiState.id = id;
		this._uiState.draggedHandle = draggedHandle;
		this.notifyAll();
	}
}

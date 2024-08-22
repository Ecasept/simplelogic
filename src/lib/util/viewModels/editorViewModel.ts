import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	MoveWireConnectionCommand,
} from "../commands";
import { GRID_SIZE, gridSnap } from "../global";
import { graphManager } from "../graph";
import type {
	ComponentConnection,
	ComponentData,
	HandleType,
	WireData,
	XYPair,
} from "../types";
import { canvasViewModel } from "./canvasViewModel";
import { ViewModel } from "./viewModel";

export type EditorUiState = {
	isMoving: boolean;
	isAdding: boolean;
	movingId: number | null;
	addingId: number | null;
	/** The handle of the wire that is being moved */
	movingWireHandleType: HandleType | null;
	isModalOpen: boolean;
};

class EditorViewModel extends ViewModel<EditorUiState> {
	protected uiState: EditorUiState = {
		isMoving: false,
		isAdding: false,
		movingId: null,
		addingId: null,
		movingWireHandleType: null,
		isModalOpen: false,
	};

	protected resetUiState() {
		this.uiState = {
			isMoving: false,
			isAdding: false,
			movingId: null,
			addingId: null,
			movingWireHandleType: null,
			isModalOpen: false,
		};
		this.notifyAll();
	}

	cancelChanges() {
		graphManager.cancelChanges();

		this.resetUiState();
	}

	applyChanges() {
		graphManager.applyChanges();

		this.resetUiState();
	}
	undo() {
		graphManager.undo();
	}

	setModalOpen(val: boolean) {
		this.uiState.isModalOpen = val;
		this.notifyAll();
	}

	// ==== Commands ====

	addComponent(newComponentData: Omit<ComponentData, "id">) {
		const cmd = new CreateComponentCommand(newComponentData);
		const id = graphManager.executeCommand(cmd);
		graphManager.notifyAll();

		this.uiState.isAdding = true;
		this.uiState.addingId = id;
		this.notifyAll();
	}
	addWire(
		newWireData: Omit<WireData, "id" | "input" | "output">,
		componentPosition: XYPair,
		handleOffset: XYPair,
		clickedHandleType: HandleType,
		componentConnection: ComponentConnection,
	) {
		const wireData = {
			...newWireData,
			input: {
				x: componentPosition.x + handleOffset.x,
				y: componentPosition.y + handleOffset.y,
				connection: null,
			},
			output: {
				x: componentPosition.x + handleOffset.x,
				y: componentPosition.y + handleOffset.y,
				connection: null,
			},
		};

		const createWireCmd = new CreateWireCommand(wireData);
		const wireId = graphManager.executeCommand(createWireCmd);
		const connectCmd = new ConnectCommand(
			{
				id: wireId,
				handleType: clickedHandleType === "input" ? "output" : "input",
			},
			componentConnection,
		);
		graphManager.executeCommand(connectCmd);
		graphManager.notifyAll();

		this.uiState.isAdding = true;
		this.uiState.addingId = wireId;
		this.uiState.movingWireHandleType = clickedHandleType;
		this.notifyAll();
	}

	startMoveComponent(id: number) {
		this.uiState.isMoving = true;
		this.uiState.movingId = id;
		this.notifyAll();
	}
	moveComponentReplaceable(
		size: XYPair,
		oldPos: XYPair,
		newClientPos: XYPair,
		id: number,
	) {
		// transform to svg coordinate system
		const svgPos = canvasViewModel.clientToSVGCoords(newClientPos);
		const newPos = {
			x: gridSnap(svgPos.x) - (size.x * GRID_SIZE) / 2,
			y: gridSnap(svgPos.y) - (size.y * GRID_SIZE) / 2,
		};
		if (newPos === oldPos) {
			return;
		}

		graphManager.moveComponentReplaceable(newPos, id, size);

		graphManager.notifyAll();
	}

	moveWireConnectionReplaceable(
		oldPos: XYPair,
		newClientPos: XYPair,
		handleType: HandleType,
		id: number,
	) {
		// transform to coordinate system of svg
		const svgPos = canvasViewModel.clientToSVGCoords(newClientPos);
		const newPos = {
			x: gridSnap(svgPos.x),
			y: gridSnap(svgPos.y),
		};
		if (newPos === oldPos) {
			return;
		}
		const cmd = new MoveWireConnectionCommand(newPos, handleType, id);
		graphManager.executeCommand(cmd, true);
		graphManager.notifyAll();
	}
}

export const editorViewModel: EditorViewModel = new EditorViewModel();

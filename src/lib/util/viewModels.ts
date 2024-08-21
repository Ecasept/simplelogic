import { GRID_SIZE, gridSnap } from "./global";
import type {
	ComponentConnection,
	ComponentData,
	HandleType,
	WireData,
	XYPair,
} from "./types";
import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	graphManager,
	MoveWireConnectionCommand,
} from "./graph";

abstract class ViewModel<UiState> {
	protected abstract uiState: UiState;
	protected abstract resetUiState(): void;
	// ==== Store Contract ====

	private subscribers: ((uiState: UiState) => void)[] = [];

	subscribe(subscriber: (uiState: UiState) => void): () => void {
		this.subscribers.push(subscriber);
		subscriber(this.uiState);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	notifyAll() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc(this.uiState);
		}
	}
}

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
		graphManager.notifyAll();

		this.resetUiState();
	}

	applyChanges() {
		graphManager.applyChanges();
		graphManager.notifyAll();

		this.resetUiState();

		console.log("applied changes");
	}
	undo() {
		graphManager.undo();
		graphManager.notifyAll();
	}

	saveGraph() {
		this.uiState.isModalOpen = true;
		this.notifyAll();
		fileModalViewModel.saveGraph();
	}

	loadGraph() {
		this.uiState.isModalOpen = true;
		this.notifyAll();
		fileModalViewModel.loadGraph();
	}

	// ==== Commands ====

	addComponent(newComponentData: Omit<ComponentData, "id">) {
		console.log("Command issued: addComponent");

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
		console.log("Command issued: addWire");

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
		console.log("Command issued: startMoveComponent");

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
		console.log("Command issued: moveComponentReplaceable");

		// transform to svg coordinate system
		const svgPos = canvasViewModel.clientToSVGCoords(newClientPos);
		const newPos = {
			x: gridSnap(svgPos.x) - (size.x * GRID_SIZE) / 2,
			y: gridSnap(svgPos.y) - (size.y * GRID_SIZE) / 2,
		};
		if (newPos === oldPos) {
			return;
		}

		graphManager.moveComponent(newPos, id, size);

		graphManager.notifyAll();
	}
	moveWireConnectionReplaceable(
		oldPos: XYPair,
		newClientPos: XYPair,
		handleType: HandleType,
		id: number,
	) {
		console.log("Command issued: moveWireConnectionReplaceable");
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

type CanvasUiState = {
	isPanning: boolean;
	viewBox: XYPair & { width: number; height: number };
};

class CanvasViewModel extends ViewModel<CanvasUiState> {
	protected uiState: CanvasUiState = {
		isPanning: false,
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
	};
	protected resetUiState(): void {
		this.uiState = {
			isPanning: false,
			viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		};
		this.notifyAll();
	}

	svg: SVGSVGElement | null = null;

	// ==== Canvas ====
	startPan() {
		this.uiState.isPanning = true;
		this.notifyAll();
	}
	endPan() {
		this.uiState.isPanning = false;
		this.notifyAll();
	}
	pan(movementX: number, movementY: number) {
		if (!this.uiState.isPanning) {
			return;
		}

		this.uiState.viewBox.x -= this.toSvgX(movementX);
		this.uiState.viewBox.y -= this.toSvgY(movementY);
		this.notifyAll();
	}
	/** Scale client's x-coordinate to svg's x-coordinate */
	private toSvgX(val: number) {
		return (val * this.uiState.viewBox.width) / (this.svg?.clientWidth ?? 1);
	}
	/** Scale client's y-coordinate to svg's y-coordinate */
	private toSvgY(val: number) {
		return (val * this.uiState.viewBox.height) / (this.svg?.clientHeight ?? 1);
	}

	clientToSVGCoords(clientPos: XYPair) {
		const point = new DOMPoint(clientPos.x, clientPos.y);

		// Get the current transformation matrix of the SVG
		const ctm = this.svg?.getScreenCTM();
		if (ctm) {
			// Inverse transform the point using the SVG's matrix
			return point.matrixTransform(ctm.inverse());
		} else {
			console.error("Failed to get SVG transformation matrix");
			return { x: 0, y: 0 };
		}
	}
}

export const canvasViewModel = new CanvasViewModel();

export type FileModalUiState = {
	state: "load" | "save" | null;
	message: string | null;
	messageType: "success" | "error" | null;
};

class FileModalViewModel extends ViewModel<FileModalUiState> {
	protected uiState: FileModalUiState = {
		state: null,
		message: null,
		messageType: null,
	};

	protected resetUiState() {
		this.uiState = {
			state: null,
			message: null,
			messageType: null,
		};
		this.notifyAll();
	}

	saveGraph() {
		this.uiState.state = "save";
		this.notifyAll();
	}
	loadGraph() {
		this.uiState.state = "load";
		this.notifyAll();
	}

	close() {
		this.resetUiState();
	}

	setSuccess(msg: string) {
		this.uiState.message = msg;
		this.uiState.messageType = "success";
		this.notifyAll();
	}
	setError(msg: string) {
		this.uiState.message = msg;
		this.uiState.messageType = "error";
		this.notifyAll();
	}
}

export const fileModalViewModel = new FileModalViewModel();

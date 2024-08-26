import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	MoveWireConnectionCommand,
} from "./commands";
import { gridSnap } from "./global";
import { Graph, GraphManager } from "./graph";
import type {
	ComponentConnection,
	ComponentData,
	GraphData,
	HandleType,
	WireData,
	XYPair,
} from "./types";
import { CanvasViewModel } from "./viewModels/canvasViewModel";
import { EditorViewModel } from "./viewModels/editorViewModel";
import { FileModalViewModel } from "./viewModels/fileModalViewModel";

export const graph = new Graph();
export const graphManager = new GraphManager(graph);
export const editorViewModel = new EditorViewModel();
export const canvasViewModel = new CanvasViewModel();
export const fileModalViewModel = new FileModalViewModel();

export class ChangesAction {
	static commitChanges() {
		graphManager.commitChanges();
		editorViewModel.reset();
	}
	static discardChanges() {
		graphManager.discardChanges();
		editorViewModel.reset();
	}
}

export class EditorAction {
	static addComponent(
		newComponentData: Omit<ComponentData, "id">,
		clickOffset: XYPair,
	) {
		const cmd = new CreateComponentCommand(newComponentData);
		const id = graphManager.executeCommand(cmd);
		graphManager.notifyAll();

		editorViewModel.startAddComponent(id, clickOffset);
	}

	static addWire(
		newWireData: Omit<WireData, "id" | "input" | "output">,
		componentPosition: XYPair,
		handleOffset: XYPair,
		clickedHandle: HandleType,
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
				handleType: clickedHandle === "input" ? "output" : "input",
			},
			componentConnection,
		);
		graphManager.executeCommand(connectCmd);
		graphManager.notifyAll();

		editorViewModel.startAddWire(wireId, clickedHandle);
	}

	// ==== Movement ====

	static move(newClientPos: XYPair, id: number) {
		if (editorViewModel.uiState.draggedHandle === null) {
			this.moveComponentReplaceable(newClientPos, id);
		} else {
			this.moveWireConnectionReplaceable(
				newClientPos,
				id,
				editorViewModel.uiState.draggedHandle,
			);
		}
	}

	static moveComponentReplaceable(newClientPos: XYPair, id: number) {
		// transform to svg coordinate system
		const svgPos = canvasViewModel.clientToSVGCoords({
			x: newClientPos.x - (editorViewModel.uiState.clickOffset?.x ?? 0),
			y: newClientPos.y - (editorViewModel.uiState.clickOffset?.y ?? 0),
		});
		const newPos = {
			x: gridSnap(svgPos.x),
			y: gridSnap(svgPos.y),
		};
		if (newPos === graphManager.getComponentData(id).position) {
			return;
		}

		graphManager.moveComponentReplaceable(newPos, id);

		graphManager.notifyAll();
	}

	static moveWireConnectionReplaceable(
		newClientPos: XYPair,
		id: number,
		draggedHandle: HandleType,
	) {
		// transform to coordinate system of svg
		const svgPos = canvasViewModel.clientToSVGCoords(newClientPos);
		const newPos = {
			x: gridSnap(svgPos.x),
			y: gridSnap(svgPos.y),
		};
		const wireHandle = graphManager.getWireData(id)[draggedHandle];
		if (newPos.x === wireHandle.x && newPos.y === wireHandle.y) {
			return;
		}
		const cmd = new MoveWireConnectionCommand(newPos, draggedHandle, id);
		graphManager.executeCommand(cmd, true);
		graphManager.notifyAll();
	}
	static undo() {
		if (graphManager.hasChanges) {
			graphManager.discardChanges();
		} else {
			graphManager.undoLastCommand();
		}
	}
}

export class PersistenceAction {
	static saveGraph() {
		ChangesAction.discardChanges();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.open("save", () => {
			PersistenceAction.closeModal();
		});
	}
	static loadGraph() {
		ChangesAction.discardChanges();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.open("load", (newGraphData: GraphData) => {
			PersistenceAction.setNewGraph(newGraphData);
			PersistenceAction.closeModal();
		});
	}
	static closeModal() {
		fileModalViewModel.close();
		editorViewModel.setModalOpen(false);
	}
	static setNewGraph(newGraphData: GraphData) {
		graph.setData(newGraphData, true);
	}
}

import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	ToggleInputPowerStateCommand,
} from "./commands";
import { constructComponent, GRID_SIZE, gridSnap } from "./global";
import { Graph, GraphManager } from "./graph";
import { simulation } from "./simulation.svelte";
import type {
	ComponentConnection,
	GraphData,
	HandleType,
	WireConnection,
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
	static toggleDelete() {
		const prevMode = editorViewModel.uiState.editType;
		ChangesAction.discardChanges();
		editorViewModel.setDelete(prevMode === "delete" ? null : "delete");
	}

	static toggleSimulate() {
		const prevMode = editorViewModel.uiState.editType;
		ChangesAction.discardChanges();
		editorViewModel.setSimulate(prevMode === "simulate" ? null : "simulate");
		if (prevMode === null) {
			simulation.startSimulation();
		}
	}

	static deleteComponent(id: number) {
		editorViewModel.removeForDeletion();
		const cmd = new DeleteComponentCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();
	}

	static deleteWire(id: number) {
		editorViewModel.removeForDeletion();
		const cmd = new DeleteWireCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();
	}

	static togglePower(id: number) {
		const cmd = new ToggleInputPowerStateCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();

		if (editorViewModel.uiState.editType === "simulate") {
			simulation.recomputeComponent(id);
		}
	}

	static addComponent(type: string, pos: XYPair) {
		ChangesAction.discardChanges();
		const cmpData = constructComponent(type, pos);
		if (cmpData === undefined) {
			return;
		}

		if (cmpData !== undefined) {
			const offsetX = (cmpData.size.x * GRID_SIZE) / 2;
			const offsetY = (cmpData.size.y * GRID_SIZE) / 2;

			// transform to client coordinate system
			const center = canvasViewModel.svgToClientCoords({
				x: offsetX,
				y: offsetY,
			});
			const origin = canvasViewModel.svgToClientCoords({ x: 0, y: 0 });
			const clickOffset = {
				x: center.x - origin.x,
				y: center.y - origin.y,
			};

			const cmd = new CreateComponentCommand(cmpData);
			const id = graphManager.executeCommand(cmd);
			graphManager.notifyAll();

			editorViewModel.startAddComponent(id, clickOffset);
		}
	}

	static addWire(
		componentPosition: XYPair,
		handleOffset: XYPair,
		clickedHandle: HandleType,
		componentConnection: ComponentConnection,
	) {
		const wireData = {
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

		const wireId = graphManager.executeCommand(new CreateWireCommand(wireData));

		const connectedHandle: WireConnection = {
			id: wireId,
			handleType: clickedHandle === "input" ? "output" : "input",
		};
		const draggedHandle = { id: wireId, handleType: clickedHandle };

		graphManager.executeCommand(
			new ConnectCommand(connectedHandle, componentConnection),
		);
		graphManager.notifyAll();

		editorViewModel.startAddWire(draggedHandle);
	}

	// ==== Movement ====

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
		graphManager.moveWireReplaceable(newPos, draggedHandle, id);
		graphManager.notifyAll();
	}
	static connect(
		conn1: WireConnection | ComponentConnection,
		conn2: WireConnection | ComponentConnection,
	) {
		const cmd = new ConnectCommand(conn1, conn2);
		graphManager.executeCommand(cmd);
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
		canvasViewModel.endPan();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.open("save", () => {
			PersistenceAction.closeModal();
		});
	}
	static loadGraph() {
		ChangesAction.discardChanges();
		canvasViewModel.endPan();
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

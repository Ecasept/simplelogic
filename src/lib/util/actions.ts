import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	ToggleInputPowerStateCommand,
} from "./commands";
import { constructComponent, GRID_SIZE, gridSnap } from "./global";
import { Graph, GraphManager } from "./graph.svelte";
import { simulation } from "./simulation.svelte";
import type {
	ComponentConnection,
	ComponentType,
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
		editorViewModel.abortEditing();
	}
	static abortEditing() {
		graphManager.discardChanges();
		editorViewModel.abortEditing();
	}
}

export class EditorAction {
	static clear() {
		graphManager.clear();
		editorViewModel.hardReset();
	}
	static toggleDelete() {
		ChangesAction.abortEditing();
		const editMode = editorViewModel.uiState.editMode;
		editorViewModel.setDelete(editMode === "delete" ? null : "delete");
	}

	static toggleSimulate() {
		ChangesAction.abortEditing();
		const editMode = editorViewModel.uiState.editMode;
		editorViewModel.setSimulate(editMode === "simulate" ? null : "simulate");
		if (editMode === null) {
			// Start simulation if we just entered simulation mode
			simulation.startSimulation();
		}
	}

	static deleteComponent(id: number) {
		editorViewModel.removeHovered();
		const cmd = new DeleteComponentCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();
	}

	static deleteWire(id: number) {
		editorViewModel.removeHovered();
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

		if (editorViewModel.uiState.editMode === "simulate") {
			simulation.recomputeComponent(id);
		}
	}

	static addComponent(type: ComponentType, pos: XYPair) {
		ChangesAction.abortEditing();
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
				connections: [],
			},
			output: {
				x: componentPosition.x + handleOffset.x,
				y: componentPosition.y + handleOffset.y,
				connections: [],
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

		// The dragged handle will always have 0 connections
		editorViewModel.startAddWire(draggedHandle, 0);
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
		ChangesAction.abortEditing();
		graphManager.undoLastCommand();
	}
}

export class PersistenceAction {
	static saveGraph() {
		ChangesAction.abortEditing();
		canvasViewModel.endPan();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.open("save", () => {
			PersistenceAction.closeModal();
		});
	}
	static loadGraph() {
		ChangesAction.abortEditing();
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
		editorViewModel.hardReset();
	}
}

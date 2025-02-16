import { P } from "ts-pattern";
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
import { CircuitModalViewModel } from "./viewModels/circuitModalViewModel";
import { EditorViewModel } from "./viewModels/editorViewModel.svelte";

export const graph = new Graph();
export const graphManager = new GraphManager(graph);
export const editorViewModel = new EditorViewModel();
export const canvasViewModel = new CanvasViewModel();
export const circuitModalViewModel = new CircuitModalViewModel();

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
	static startPanning() {
		canvasViewModel.startPanning();
		editorViewModel.startPanning();
	}
	static stopPanning() {
		canvasViewModel.stopPanning();
		editorViewModel.stopPanning();
	}
	static abortPanning() {
		canvasViewModel.abortPanning();
		editorViewModel.stopPanning();
	}

	static clear() {
		graphManager.clear();
		editorViewModel.hardReset();
	}

	static deleteComponent(id: number) {
		editorViewModel.removeHoveredElement();
		const cmd = new DeleteComponentCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();
	}

	static deleteWire(id: number) {
		editorViewModel.removeHoveredElement();
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

		if (editorViewModel.uiState.matches({ mode: "simulate" })) {
			simulation.recomputeComponent(id);
		}
	}

	static addComponent(
		type: ComponentType,
		pos: XYPair,
		initiator: "drag" | "keyboard",
	) {
		ChangesAction.abortEditing();
		const cmpData = constructComponent(type, pos);
		if (cmpData === undefined) {
			return;
		}

		if (cmpData !== undefined) {
			const offsetX = (cmpData.size.x * GRID_SIZE) / 2;
			const offsetY = (cmpData.size.y * GRID_SIZE) / 2;

			const clickOffset = {
				x: offsetX,
				y: offsetY,
			};

			const cmd = new CreateComponentCommand(cmpData);
			const id = graphManager.executeCommand(cmd);
			graphManager.notifyAll();

			editorViewModel.startAddComponent(id, clickOffset, initiator);
		}
	}

	static addWire(
		position: XYPair,
		clickedHandle: HandleType,
		connection: ComponentConnection | WireConnection,
	) {
		const wireData = {
			input: {
				x: position.x,
				y: position.y,
				connections: [],
			},
			output: {
				x: position.x,
				y: position.y,
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
			new ConnectCommand(connectedHandle, connection),
		);
		graphManager.notifyAll();

		// The dragged handle will always have 0 connections
		editorViewModel.startAddWire(draggedHandle, 0);
	}

	// ==== Movement ====

	static moveComponentReplaceable(newClientPos: XYPair, id: number) {
		if (
			!editorViewModel.uiState.matches({
				editType: P.union("draggingComponent", "addingComponent"),
			})
		) {
			throw new Error("Tried dragging a component without starting it");
		}

		const offsetX = editorViewModel.uiState.clickOffset.x;
		const offsetY = editorViewModel.uiState.clickOffset.y;

		// transform to svg coordinate system
		const svgPos = canvasViewModel.clientToSVGCoords({
			x: newClientPos.x,
			y: newClientPos.y,
		});
		const newPos = {
			x: gridSnap(svgPos.x - offsetX),
			y: gridSnap(svgPos.y - offsetY),
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
export class ModeAction {
	static switchToDefaultMode() {
		ChangesAction.abortEditing();
		editorViewModel.switchToEditMode();
	}

	static switchToDeleteMode() {
		ChangesAction.abortEditing();
		editorViewModel.switchToDeleteMode();
	}

	static switchToSimulateMode() {
		ChangesAction.abortEditing();
		editorViewModel.switchToSimulationMode();
		simulation.startSimulation();
	}
	static toggleDelete() {
		if (editorViewModel.uiState.matches({ mode: "delete" })) {
			ModeAction.switchToDefaultMode();
		} else {
			ModeAction.switchToDeleteMode();
		}
	}
	static toggleSimulate() {
		if (editorViewModel.uiState.matches({ mode: "simulate" })) {
			ModeAction.switchToDefaultMode();
		} else {
			ModeAction.switchToSimulateMode();
		}
	}
}

export class PersistenceAction {
	static saveGraph() {
		ChangesAction.abortEditing();
		canvasViewModel.stopPanning();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("save", () => {
			PersistenceAction.closeModal();
		});
	}
	static loadGraph() {
		ChangesAction.abortEditing();
		canvasViewModel.stopPanning();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("load", (newGraphData: GraphData) => {
			PersistenceAction.setNewGraph(newGraphData);
			PersistenceAction.closeModal();
		});
	}
	static closeModal() {
		circuitModalViewModel.close();
		editorViewModel.setModalOpen(false);
	}
	static setNewGraph(newGraphData: GraphData) {
		graph.setData(newGraphData, true);
		editorViewModel.hardReset();
	}
}

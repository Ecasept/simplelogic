import { P } from "ts-pattern";
import {
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	ToggleInputPowerStateCommand,
} from "./commands";
import { constructComponent, GRID_SIZE, gridSnap } from "./global.svelte";
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
		const cmd = new DeleteComponentCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.commitChanges();
		graphManager.notifyAll();
	}

	static deleteWire(id: number) {
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

	/** Moves a component to a new position
	 *
	 * While moving a component, this function can be called multiple times
	 * to update the position of the component. This function is "replaceable",
	 * which means that each time it is called, the previous move is undone
	 * and replaced with the new move.
	 *
	 * @param mousePos - The current mouse position, in client coordinates.
	 * The component will be moved to this position,
	 * but the initial offset will be preserved.
	 * (eg. if the user started dragging the component from the middle,
	 * the component will stay under the mouse cursor)
	 *
	 * @param id - The id of the component that is being moved
	 *
	 *
	 */
	static moveComponentReplaceable(mousePos: XYPair, id: number) {
		if (
			!editorViewModel.uiState.matches({
				editType: P.union("draggingComponent", "addingComponent"),
			})
		) {
			throw new Error("Tried dragging a component without starting it");
		}

		const offsetX = editorViewModel.uiState.clickOffset.x;
		const offsetY = editorViewModel.uiState.clickOffset.y;

		const svgMousePos = canvasViewModel.clientToSVGCoords(mousePos);
		// The offset is where the user clicked on the component
		// We don't just want to move the component to the new mouse position
		// because that would make the component jump to the mouse position, and it would be dragged from the top left corner.
		// Instead, we want to slightly shift the component so that the point where the user clicked on the component
		// stays under the mouse cursor.
		const newPos = {
			x: gridSnap(svgMousePos.x - offsetX),
			y: gridSnap(svgMousePos.y - offsetY),
		};

		const oldPos = graphManager.getComponentData(id).position;
		if (newPos.x === oldPos.x && newPos.y === oldPos.y) {
			// The component hasn't actually moved, so we don't need to do anything
			return;
		}

		if (editorViewModel.uiState.matches({ hasMoved: false })) {
			// Tell the view model that the component has actually been moved
			editorViewModel.registerMove();
		}

		// Actually update the component's position
		graphManager.moveComponentReplaceable(newPos, id);
		graphManager.notifyAll();
	}

	static moveWireConnectionReplaceable(
		mousePos: XYPair,
		id: number,
		draggedHandle: HandleType,
	) {
		const svgMousePos = canvasViewModel.clientToSVGCoords(mousePos);
		const newPos = {
			x: gridSnap(svgMousePos.x),
			y: gridSnap(svgMousePos.y),
		};
		const wireHandle = graphManager.getWireData(id)[draggedHandle];
		if (newPos.x === wireHandle.x && newPos.y === wireHandle.y) {
			// The wire hasn't actually moved, so we don't need to do anything
			return;
		}

		if (editorViewModel.uiState.matches({ hasMoved: false })) {
			// Tell the view model that the wire has actually been moved
			editorViewModel.registerMove();
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
	/** Deletes the currently selected element */
	static deleteSelected() {
		const uiState = editorViewModel.uiState;
		if (!("selected" in uiState)) {
			console.warn(
				"Tried to delete selected element without being in a mode that supports selection",
			);
			return;
		}
		const selected = uiState.selected;
		if (selected === null) {
			console.warn(
				"Tried to delete selected element, but no element is selected",
			);
			return;
		}
		const type = graphManager.getElementType(selected);

		if (type === "component") {
			EditorAction.deleteComponent(selected);
		} else if (type === "wire") {
			EditorAction.deleteWire(selected);
		} else {
			console.error(
				`Could not delete selected element with ID ${selected}: Element not found`,
			);
		}
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

import { P } from "ts-pattern";
import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	MoveWireConnectionCommand,
	RotateComponentCommand,
	ToggleInputPowerStateCommand,
	type Command,
	type ValidWireData,
} from "./commands";
import { constructComponent, GRID_SIZE, gridSnap } from "./global.svelte";
import { GraphManager } from "./graph.svelte";
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

export const graphManager = new GraphManager();
export const editorViewModel = new EditorViewModel();
export const canvasViewModel = new CanvasViewModel();
export const circuitModalViewModel = new CircuitModalViewModel();

export class ChangesAction {
	static commitChanges() {
		editorViewModel.abortEditing();
		graphManager.applyChanges();
		graphManager.notifyAll();
	}
	static abortEditing() {
		editorViewModel.abortEditing();
		graphManager.discardChanges();
		graphManager.notifyAll();
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

	static clearCanvas() {
		editorViewModel.hardReset();
		graphManager.clear();
		graphManager.notifyAll();
	}

	/** Delete the component with the given ID */
	static deleteComponent(id: number) {
		// If the component is selected, clear the selection
		if (editorViewModel.uiState.matches({ selected: id })) {
			editorViewModel.clearSelection();
		}

		const cmd = new DeleteComponentCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.applyChanges();
		graphManager.notifyAll();
	}

	/** Delete the wire with the given ID */
	static deleteWire(id: number) {
		// If the wire was selected, clear the selection
		if (editorViewModel.uiState.matches({ selected: id })) {
			editorViewModel.clearSelection();
		}

		const cmd = new DeleteWireCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.applyChanges();
		graphManager.notifyAll();
	}

	static togglePower(id: number) {
		const cmd = new ToggleInputPowerStateCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.applyChanges();
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
		const wireData: ValidWireData = {
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

		const { didUndo, deletedIds } = graphManager.undoLastCommand();

		// Ensure that if the selected element was deleted, it is no longer selected
		if (
			didUndo &&
			deletedIds.length > 0 &&
			editorViewModel.uiState.matches({
				selected: P.union(deletedIds[0], ...deletedIds.slice(1)),
			})
		) {
			editorViewModel.clearSelection();
		}

		// Notify listeners after clearing selection
		// to prevent selection from pointing to a deleted element
		if (didUndo) {
			graphManager.notifyAll();
		}
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

	/** Rotates the component with the given ID by the given angle
	 *
	 * The component will be rotated around its center,
	 * and all wire connections will be rotated around the component's center as well.
	 *
	 * @param id - The ID of the component to rotate
	 * @param rotateBy - The angle to rotate the component by, in degrees
	 */
	static rotateComponent(id: number, rotateBy: number) {
		const commands: Command[] = [];
		commands.push(new RotateComponentCommand(id, rotateBy));

		const cmpData = graphManager.getComponentData(id);

		const cx = cmpData.position.x + (cmpData.size.x * GRID_SIZE) / 2;
		const cy = cmpData.position.y + (cmpData.size.y * GRID_SIZE) / 2;
		const angle = (rotateBy / 180) * Math.PI;
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);

		// Rotate all wire connections
		for (const handleId in cmpData.handles) {
			const handle = cmpData.handles[handleId];
			for (const conn of handle.connections) {
				const wireId = conn.id;
				const wireData = graphManager.getWireData(wireId);
				const x = wireData[conn.handleType].x;
				const y = wireData[conn.handleType].y;

				// Rotate (x, y) (position of wire connection) around (cx, cy) (position of component)
				const dx = x - cx;
				const dy = y - cy;
				const nx = dx * cos - dy * sin + cx;
				const ny = dx * sin + dy * cos + cy;

				const cmd = new MoveWireConnectionCommand(
					{ x: nx, y: ny },
					conn.handleType,
					wireId,
				);
				commands.push(cmd);
			}
		}

		const group = new CommandGroup(commands);

		graphManager.executeCommand(group);
		graphManager.applyChanges();
		graphManager.notifyAll();
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
		simulation.restart();
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
		editorViewModel.hardReset();
		graphManager.clear();
		graphManager.setGraphData(newGraphData);
		graphManager.notifyAll();
	}
}

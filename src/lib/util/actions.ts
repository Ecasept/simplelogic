import { P } from "ts-pattern";
import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	MoveWireHandleCommand,
	RotateComponentCommand,
	ToggleInputPowerStateCommand,
	type Command,
} from "./commands";
import {
	constructComponent,
	GRID_SIZE,
	gridSnap,
	rotateAroundBy,
} from "./global.svelte";
import { GraphManager } from "./graph.svelte";
import { simController } from "./simulation.svelte";
import {
	newWireHandleRef,
	type ComponentType,
	type GraphData,
	type HandleReference,
	type HandleType,
	type ValidWireInitData,
	type XYPair,
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
			simController.recomputeComponent(id);
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

	/**
	 * Adds a wire to the graph when a handle was clicked,
	 * and connects the wire to the clicked handle.
	 * @param position The position where the clicked handle is located,
	 * @param clickedHandle The handle that was clicked, which will be connected to the wire.
	 */
	static addWire(position: XYPair, clickedHandle: HandleReference) {
		const wireData: ValidWireInitData = {
			handles: {
				input: {
					x: position.x,
					y: position.y,
					type: "input",
					connections: [],
				},
				output: {
					x: position.x,
					y: position.y,
					type: "output",
					connections: [],
				},
			},
		};

		const wireId = graphManager.executeCommand(new CreateWireCommand(wireData));

		// The type of the handle that will be connected to the clicked handle
		const handleType =
			clickedHandle.handleType === "input" ? "output" : "input";
		// The handle connected to the clicked handle
		const connectedHandle = newWireHandleRef(wireId, handleType);
		// The handle that will be dragged (opposite of the connected handle)
		const draggedHandle = newWireHandleRef(wireId, clickedHandle.handleType);

		graphManager.executeCommand(
			new ConnectCommand(connectedHandle, clickedHandle),
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
		const wireHandle = graphManager.getWireData(id).handles[draggedHandle];
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
	static connect(conn1: HandleReference, conn2: HandleReference) {
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
		ChangesAction.abortEditing();
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

		const componentPos = {
			x: cmpData.position.x + (cmpData.size.x * GRID_SIZE) / 2,
			y: cmpData.position.y + (cmpData.size.y * GRID_SIZE) / 2,
		};

		// Rotate all wire connections
		for (const handleId in cmpData.handles) {
			const handle = cmpData.handles[handleId];
			for (const conn of handle.connections) {
				const wireId = conn.id;
				const wireData = graphManager.getWireData(wireId);
				const wirePos = {
					x: wireData.handles[conn.handleId].x,
					y: wireData.handles[conn.handleId].y,
				};

				const rotatedPos = rotateAroundBy(wirePos, componentPos, rotateBy);

				const cmd = new MoveWireHandleCommand(
					rotatedPos,
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
	static async switchToDefaultMode() {
		await simController.stopLoop();
		ChangesAction.abortEditing();
		editorViewModel.switchToEditMode();
	}

	static async switchToDeleteMode() {
		await simController.stopLoop();
		ChangesAction.abortEditing();
		editorViewModel.switchToDeleteMode();
	}

	static async switchToSimulateMode() {
		ChangesAction.abortEditing();
		editorViewModel.switchToSimulationMode();
		simController.start();
	}
	static async toggleDelete() {
		if (editorViewModel.uiState.matches({ mode: "delete" })) {
			await ModeAction.switchToDefaultMode();
		} else {
			await ModeAction.switchToDeleteMode();
		}
	}
	static async toggleSimulate() {
		if (editorViewModel.uiState.matches({ mode: "simulate" })) {
			await ModeAction.switchToDefaultMode();
		} else {
			await ModeAction.switchToSimulateMode();
		}
	}
}

export class PersistenceAction {
	static saveGraph() {
		ChangesAction.abortEditing();
		canvasViewModel.stopPanning();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("save", () => {});
	}
	static loadGraph() {
		ChangesAction.abortEditing();
		canvasViewModel.stopPanning();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("load", (newGraphData: GraphData) => {
			PersistenceAction.setNewGraph(newGraphData);
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

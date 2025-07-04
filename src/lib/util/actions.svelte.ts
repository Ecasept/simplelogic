import { match, P } from "ts-pattern";
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
	UpdateCustomDataCommand,
	type Command,
} from "./commands";
import {
	constructComponent,
	GRID_SIZE,
	gridSnap,
	rotateAroundBy,
	setLastRotation,
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
import {
	EditorViewModel,
	type ElementType,
	type TypedReference,
} from "./viewModels/editorViewModel.svelte";

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

export class DeleteAction {
	/** Deletes all elements in the given map `refs`.
	 * Ensures that they don't stay selected.
	 */
	static deleteMulti(refs: Map<number, ElementType>) {
		const commands: Command[] = [];
		// iterate over map
		for (const [id, type] of refs) {
			// If the component is selected, clear the selection
			if (editorViewModel.isSelectedId(id)) {
				editorViewModel.removeSelectedId(id);
			}
			const command =
				type === "component" ? DeleteComponentCommand : DeleteWireCommand;
			commands.push(new command(id));
		}
		const group = new CommandGroup(commands);
		graphManager.executeCommand(group);
		graphManager.applyChanges();
		graphManager.notifyAll();
	}

	/** Deletes one specific component by its ID. */
	static deleteComponent(id: number) {
		const map = new Map<number, ElementType>();
		map.set(id, "component");

		DeleteAction.deleteMulti(map);
	}

	/** Deletes one specific wire by its ID. */
	static deleteWire(id: number) {
		const map = new Map<number, ElementType>();
		map.set(id, "wire");

		DeleteAction.deleteMulti(map);
	}

	/** Deletes all currently selected elements. */
	static deleteSelected() {
		const uiState = editorViewModel.uiState;
		if (!uiState.matches({ mode: "edit" })) {
			console.warn(
				"Tried to delete selected element without being in edit mode",
			);
			return;
		}
		if (!("selected" in uiState)) {
			console.warn(
				"Tried to delete selected element without being in a mode that supports selection",
			);
			return;
		}
		DeleteAction.deleteMulti(uiState.selected);
	}
}

export class AddAction {
	/** Initiates the process of adding a component to the graph.
	 * @param type The type of the component to add.
	 * @param pos The position where the mouse was clicke, and the component should be placed (in client coordinates).
	 * @param initiator String indicating how the component was added, either by dragging it from the toolbar or through the keyboard shortcut.
	 */
	static addComponent(
		type: ComponentType,
		pos: XYPair,
		initiator: "drag" | "keyboard",
	) {
		ChangesAction.abortEditing();
		const clickSvgPos = canvasViewModel.clientToSVGCoords(pos);
		const cmpPos = {
			x: clickSvgPos.x,
			y: clickSvgPos.y,
		};

		const cmpData = constructComponent(type, cmpPos);

		const cmd = new CreateComponentCommand(cmpData);
		const id = graphManager.executeCommand(cmd);
		graphManager.notifyAll();

		// Create element reference for the new component
		const element: TypedReference = { id, type: "component" };

		// Start adding component mode
		editorViewModel.startAddComponent(element, clickSvgPos, initiator);

		// Snap the component to the grid
		MoveAction.moveElementsReplaceable(clickSvgPos);
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
}

export class MoveAction {
	/** Moves a component to a new position
	 *
	 * While moving a component, this function can be called multiple times
	 * to update the position of the component. This function is "replaceable",
	 * which means that each time it is called, the previous move is undone
	 * and replaced with the new move.
	 *
	 * @param mousePos The current mouse position, in client coordinates.
	 *
	 * The component will be moved to the new position. See `graphManager.moveElementsReplaceable`
	 * for more details on how the movement is handled.
	 *
	 * This function calculates how much the mouse has moved since the click started.
	 * This is passed to the `graphManager.moveElementsReplaceable` function.
	 * It does all of the movement logic. It also tells us if a click on a component
	 * has moved the component enough to start a drag operation.
	 */
	static moveElementsReplaceable(mousePos: XYPair) {
		const uiState = editorViewModel.uiState;
		if (
			!uiState.matches({
				editType: P.union("draggingElements", "elementDown", "addingComponent"),
			})
		) {
			throw new Error(
				"Tried to move elements without being in dragging, elementDown, or addingComponent state",
			);
		}

		const oldPos = uiState.clickPosition;
		const newPos = canvasViewModel.clientToSVGCoords(mousePos);
		const offset = {
			x: newPos.x - oldPos.x,
			y: newPos.y - oldPos.y,
		};

		const moveSelected = match(uiState)
			.with({ editType: "draggingElements" }, (state) => state.draggingSelected)
			.with({ editType: "addingComponent" }, () => false)
			.with({ editType: "elementDown" }, (state) =>
				editorViewModel.isSelected(state.clickedElement),
			)
			.exhaustive();

		let elements = moveSelected
			? new Map(uiState.selected)
			: new Map<number, ElementType>();
		elements.set(uiState.clickedElement.id, uiState.clickedElement.type);

		const moved = graphManager.moveElementsReplaceable(offset, elements);

		// If we're in elementDown state and this is the first move, transition to draggingElements
		if (moved && uiState.matches({ editType: "elementDown" })) {
			// Start drag with the appropriate mode: drag selected elements if this element is selected
			editorViewModel.startDrag(
				$state.snapshot(uiState.clickedElement),
				$state.snapshot(uiState.clickPosition),
				moveSelected,
			);
		}
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

	static togglePower(id: number) {
		const cmd = new ToggleInputPowerStateCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.applyChanges();
		graphManager.notifyAll();

		if (editorViewModel.uiState.matches({ mode: "simulate" })) {
			simController.recomputeComponent(id);
		}
	}

	static updateTextReplaceable(id: number, newText: string) {
		graphManager.updateTextReplaceable(id, newText);
		graphManager.notifyAll();
	}

	static updateTextFontSize(id: number, newSize: number) {
		const command = new UpdateCustomDataCommand(id, "fontSize", newSize);
		graphManager.executeCommand(command);
		graphManager.applyChanges();
		graphManager.notifyAll();
	}

	// ==== Movement ====

	static connect(conn1: HandleReference, conn2: HandleReference) {
		const cmd = new ConnectCommand(conn1, conn2);
		graphManager.executeCommand(cmd);
		graphManager.notifyAll();
	}
	static undo() {
		ChangesAction.abortEditing();

		const { didUndo, deletedIds } = graphManager.undoLastCommand();

		// Ensure that if any selected elements were deleted, they are no longer selected
		if (didUndo && deletedIds.length > 0) {
			for (const deletedId of deletedIds) {
				if (editorViewModel.isSelectedId(deletedId)) {
					editorViewModel.removeSelectedId(deletedId);
				}
			}
		}

		// Notify listeners after clearing selection
		// to prevent selection from pointing to a deleted element
		if (didUndo) {
			graphManager.notifyAll();
		}
	}

	/** Rotates the component with the given ID by the given angle
	 *
	 * The component will be rotated around its center,
	 * and all wire connections will be rotated around the component's center as well.
	 *
	 * @param id - The ID of the component to rotate
	 * @param rotateBy - The angle to rotate the component by, in degrees
	 * @param apply - Whether to apply the changes immediately or not.
	 */
	static rotateComponent(id: number, rotateBy: number, apply: boolean = true) {
		const commands: Command[] = [];
		commands.push(new RotateComponentCommand(id, rotateBy));

		const cmpData = graphManager.getComponentData(id);
		setLastRotation((cmpData.rotation + rotateBy) % 360);

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
		if (apply) {
			graphManager.applyChanges();
		}
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

import { P } from "ts-pattern";
import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	MoveWireHandleCommand,
	RawAddCommand,
	RotateComponentCommand,
	ToggleInputPowerStateCommand,
	UpdateCustomDataCommand,
	type Command,
} from "./commands";
import {
	calculateHandlePosition,
	constructComponent,
	GRID_SIZE,
	rotateAroundBy,
	setLastRotation,
} from "./global.svelte";
import { GraphManager } from "./graph.svelte";
import { mover } from "./move.svelte";
import { simController } from "./simulation.svelte";
import {
	newWireHandleRef,
	type ComponentHandle,
	type ComponentType,
	type GraphData,
	type HandleReference,
	type ValidWireInitData,
	type WireHandle,
	type XYPair,
} from "./types";
import { CanvasViewModel } from "./viewModels/canvasViewModel";
import { CircuitModalViewModel } from "./viewModels/circuitModalViewModel";
import {
	EditorViewModel,
	type EditorUiState,
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

export class DuplicateAction {
	/** Duplicates all selected elements. New ids are assigned sequentially starting at current nextId.
	 * Connections pointing outside the duplicated subset are removed.
	 */
	static duplicateSelected() {
		const uiState = editorViewModel.uiState;
		if (!uiState.matches({ mode: "edit", editType: "idle" })) return;
		if (!("selected" in uiState) || uiState.selected.size === 0) return;
		const data = graphManager.getGraphData();

		// Collect ids
		const oldSelected = uiState.selected; // Map<number, ElementType>

		// Build mapping oldId -> newId
		let nextId = data.nextId;
		const idMap = new Map<number, number>();
		for (const id of oldSelected.keys()) {
			idMap.set(id, nextId++);
		}

		const commands: Command[] = [];
		// Duplicate components
		for (const [oldId, type] of oldSelected) {
			const orig = type === "component" ? data.components[oldId] : data.wires[oldId];
			if (!orig) continue;

			const clone = structuredClone(orig);
			clone.id = idMap.get(oldId)!;

			// Filter connections to only those inside subset and remap ids
			for (const handle of Object.values(clone.handles) as (WireHandle | ComponentHandle)[]) {
				handle.connections = handle.connections
					.filter((c) => idMap.has(c.id))
					.map((c) => ({ ...c, id: idMap.get(c.id)! }));
			}
			commands.push(new RawAddCommand(type, clone, nextId));
		}

		if (commands.length === 0) return;
		const group = new CommandGroup(commands, "duplicate");
		graphManager.executeCommand(group);
		graphManager.applyChanges();
		graphManager.notifyAll();

		// Update selection to new elements
		const newSelection: Map<number, ElementType> = new Map();
		for (const [oldId, newId] of idMap) {
			const t = oldSelected.get(oldId)!;
			newSelection.set(newId, t);
		}
		editorViewModel.setSelectedElements(Array.from(newSelection, ([id, type]) => ({ id, type })));
	}
}

export class AddAction {
	/** Initiates the process of adding a component to the graph.
	 * @param type The type of the component to add.
	 * @param clickPos The position where the mouse was clicked, and the component should be placed (in client coordinates).
	 * @param initiator String indicating how the component was added, either by dragging it from the toolbar or through the keyboard shortcut.
	 */
	static addComponent(
		type: ComponentType,
		clickPos: XYPair,
		initiator: "drag" | "keyboard",
	) {
		ChangesAction.abortEditing();
		const clickSvgPos = canvasViewModel.clientToSVGCoords(clickPos);

		const cmpData = constructComponent(type, clickSvgPos);

		const cmd = new CreateComponentCommand(cmpData);
		const id = graphManager.executeCommand(cmd);
		graphManager.notifyAll();

		// Create element reference for the new component
		const element: TypedReference = { id, type: "component" };

		// Start adding component mode
		editorViewModel.startAddComponent(element, clickSvgPos, initiator);

		// Snap the component to the grid
		MoveAction.onMove(clickSvgPos);
	}

	/**
	 * Adds a wire to the graph when a handle was clicked,
	 * and connects the wire to the clicked handle.
	 * @param clickPos
	 * @param clickedHandle The handle that was clicked, which will be connected to the wire.
	 */
	static addWire(clickSvgPos: XYPair, clickedHandle: HandleReference) {
		const wireData: ValidWireInitData = {
			handles: {
				input: {
					x: clickSvgPos.x,
					y: clickSvgPos.y,
					type: "input",
					connections: [],
				},
				output: {
					x: clickSvgPos.x,
					y: clickSvgPos.y,
					type: "output",
					connections: [],
				},
			},
		};

		// Add the wire
		const wireId = graphManager.executeCommand(new CreateWireCommand(wireData));

		// Connect it to the clicked handle
		/** The type of the handle that will be connected to the clicked handle */
		const handleType =
			clickedHandle.handleType === "input" ? "output" : "input";
		/** The handle connected to the clicked handle */
		const connectedHandle = newWireHandleRef(wireId, handleType);
		/** The handle that will be dragged (opposite of the connected handle) */
		const draggedHandle = newWireHandleRef(wireId, clickedHandle.handleType);

		graphManager.executeCommand(
			new ConnectCommand(connectedHandle, clickedHandle),
		);
		graphManager.notifyAll();

		// The new dragged handle will always have 0 connections
		editorViewModel.startAddWire(draggedHandle, clickSvgPos, 0);

		MoveAction.onMove(clickSvgPos);
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
	static onMove(svgMousePos: XYPair) {
		const uiState = editorViewModel.uiState;
		if (
			!uiState.matches({
				editType: P.union(
					"draggingElements",
					"elementDown",
					"addingComponent",
					"draggingWireHandle",
					"addingWire",
					"wireHandleDown",
				),
			})
		) {
			// If we're not in a mode that supports moving elements, do nothing
			return;
		}

		const oldPos = uiState.clickPosition;
		const newPos = svgMousePos;
		const offset = {
			x: newPos.x - oldPos.x,
			y: newPos.y - oldPos.y,
		};

		switch (uiState.editType) {
			case "addingComponent":
				this.addingComponent(uiState, offset);
				break;
			case "draggingElements":
				this.draggingElements(uiState, offset);
				break;
			case "elementDown":
				this.elementDown(uiState, offset);
				break;
			case "wireHandleDown":
				this.wireHandleDown(uiState, offset);
				break;
			case "draggingWireHandle":
				this.draggingWireHandle(uiState, offset);
				break;
			case "addingWire":
				this.addingWire(uiState, offset);
				break;
		}
	}

	private static addingComponent(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "addingComponent" })) {
			throw new Error("wrong mode");
		}
		const elements = new Map<number, ElementType>();
		elements.set(uiState.clickedElement.id, uiState.clickedElement.type);
		mover.moveElementsReplaceable(offset, elements);
	}

	private static draggingElements(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "draggingElements" })) {
			throw new Error("wrong mode");
		}
		let elements: Map<number, ElementType> | undefined;
		if (uiState.draggingSelected) {
			elements = new Map(uiState.selected);
		} else {
			// If we're dragging a single element, we only move that element
			elements = new Map<number, ElementType>();
			elements.set(uiState.clickedElement.id, uiState.clickedElement.type);
		}
		mover.moveElementsReplaceable(offset, elements);
	}

	private static elementDown(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "elementDown" })) {
			throw new Error("wrong mode");
		}
		const isSelected = editorViewModel.isSelected(uiState.clickedElement);
		let elements: Map<number, ElementType> | undefined;
		if (isSelected) {
			// If the clicked element is selected, we move all selected elements
			elements = new Map(uiState.selected);
		} else {
			// If the clicked element is not selected, we only move that element
			elements = new Map<number, ElementType>();
			elements.set(uiState.clickedElement.id, uiState.clickedElement.type);
		}
		const moved = mover.moveElementsReplaceable(offset, elements);
		// If we're in elementDown state and this is the first move, transition to draggingElements
		if (moved) {
			// Start drag with the appropriate mode: drag selected elements if this element is selected
			editorViewModel.startDrag(
				$state.snapshot(uiState.clickedElement),
				$state.snapshot(uiState.clickPosition),
				isSelected,
			);
		}
	}

	private static wireHandleDown(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "wireHandleDown" })) {
			throw new Error("wrong mode");
		}
		const ref = $state.snapshot(uiState.clickedHandle);
		const moved = mover.moveWireHandleReplaceable(offset, ref);
		if (moved) {
			// Start dragging the wire handle
			editorViewModel.startDragWireHandle(
				ref,
				$state.snapshot(uiState.clickPosition),
				$state.snapshot(uiState.connectionCount),
			);
		}
	}

	private static draggingWireHandle(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "draggingWireHandle" })) {
			throw new Error("wrong mode");
		}
		const ref = uiState.draggedHandle;
		mover.moveWireHandleReplaceable(offset, ref);
	}

	private static addingWire(uiState: EditorUiState, offset: XYPair) {
		if (!uiState.matches({ editType: "addingWire" })) {
			throw new Error("wrong mode");
		}
		const ref = uiState.draggedHandle;
		mover.moveWireHandleReplaceable(offset, ref);
	}
}

export class EditorAction {
	static startAreaSelection(pos: XYPair) {
		editorViewModel.startAreaSelection();
		canvasViewModel.startAreaSelection(pos);
	}
	static stopAreaSelection() {
		if (!canvasViewModel.uiState.isAreaSelecting) {
			console.warn("stopAreaSelection called when not area selecting");
			return;
		}
		const startPos = canvasViewModel.uiState.startPos;
		const endPos = canvasViewModel.uiState.currentPos;
		editorViewModel.stopAreaSelection();
		canvasViewModel.stopAreaSelection();
		const areaSelectType = editorViewModel.uiState.settings.areaSelectType;
		const elements = graphManager.getElementsInArea(startPos, endPos, areaSelectType);
		editorViewModel.setSelectedElements(elements);
	}
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

	/** Returns the position of the given handle reference. */
	private static getPos(ref: HandleReference) {
		if (ref.type == "component") {
			const cmp = graphManager.getComponentData(ref.id);
			const handle = cmp.handles[ref.handleId];
			return calculateHandlePosition(
				handle.edge,
				handle.pos,
				cmp.size,
				cmp.position,
				cmp.rotation,
				true,
			);
		} else {
			const handle = graphManager.getWireData(ref.id).handles[ref.handleId];
			return { x: handle.x, y: handle.y };
		}
	}

	static connect(conn1: HandleReference, conn2: HandleReference) {

		// Move conn1 to the position of conn2 before connecting
		const pos2 = this.getPos(conn2);
		const cmdMove = new MoveWireHandleCommand(
			pos2,
			conn1.handleType,
			conn1.id,
		);

		// Connect the two handles
		const cmd = new ConnectCommand(conn1, conn2);

		const group = new CommandGroup([cmdMove, cmd], "connect");

		graphManager.executeCommand(group);
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
		circuitModalViewModel.open("save", () => { });
	}
	/** Opens the load modal in non-fresh mode (i.e. not onboarding). */
	static loadGraphManually() {
		PersistenceAction.loadGraph(false);
	}
	static loadGraph(isOnboarding: boolean) {
		ChangesAction.abortEditing();
		canvasViewModel.stopPanning();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("load", (newGraphData, type) => {
			PersistenceAction.setNewGraph(newGraphData);
			if (isOnboarding && type === "preset") {
				// If the user is new and selected a preset,
				// show him the circuit immediately for better onboarding
				PersistenceAction.closeModal();
			}
		}, { isOnboarding });
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

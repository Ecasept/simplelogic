import {
	CommandGroup,
	DeleteComponentCommand,
	DeleteWireCommand,
	MoveWireHandleCommand,
	RotateComponentCommand,
	ToggleInputPowerStateCommand,
	UpdateCustomDataCommand,
	type Command,
} from "../graph/commands";
import {
	GRID_SIZE,
	rotateAroundBy,
	setLastRotation,
} from "../shared/global.svelte";
import type { GraphManager } from "../graph/graph.svelte";
import type { EditorViewModel, ElementType } from "./editorViewModel.svelte";
import type { InteractionController } from "../interaction/interaction.svelte";
import { simController } from "../graph/simulation.svelte";

/** Immediate graph edits and history commands. Pointer-driven edits live in the controller. */
export function createGraphActions(
	graphManager: GraphManager,
	editorViewModel: EditorViewModel,
	interactionController: InteractionController,
) {
	/** Deletes all elements in the given map `refs`.
	 * Ensures that they don't stay selected.
	 */
	function deleteMulti(refs: Map<number, ElementType>) {
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
	}

	/** Deletes one specific component by its ID. */
	function deleteComponent(id: number) {
		const map = new Map<number, ElementType>();
		map.set(id, "component");

		deleteMulti(map);
	}

	/** Deletes one specific wire by its ID. */
	function deleteWire(id: number) {
		const map = new Map<number, ElementType>();
		map.set(id, "wire");

		deleteMulti(map);
	}

	/** Deletes all currently selected elements. */
	function deleteSelected() {
		const uiState = editorViewModel.uiState;
		if (uiState.mode !== "edit") {
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
		deleteMulti(uiState.selected);
	}

	function togglePower(id: number) {
		const cmd = new ToggleInputPowerStateCommand(id);
		graphManager.executeCommand(cmd);
		graphManager.applyChanges();

		if (editorViewModel.uiState.mode === "simulate") {
			simController.recomputeComponent(id);
		}
	}

	function updateTextFontSize(id: number, newSize: number) {
		const command = new UpdateCustomDataCommand(id, "fontSize", newSize);
		graphManager.executeCommand(command);
		graphManager.applyChanges();
	}

	function updateCustomDataMerged(
		id: number,
		property: string,
		newValue: unknown,
	) {
		graphManager.updateCustomDataMerged(id, property, newValue);
	}

	function updateTextAlignment(
		id: number,
		newAlignment: "left" | "center" | "right",
	) {
		const command = new UpdateCustomDataCommand(id, "alignment", newAlignment);
		graphManager.executeCommand(command);
		graphManager.applyChanges();
	}

	function updateIoShowLabel(id: number, showLabel: boolean) {
		const command = new UpdateCustomDataCommand(id, "showLabel", showLabel);
		graphManager.executeCommand(command);
		graphManager.applyChanges();
	}

	function undo() {
		interactionController.cancel();

		const { didUndo, deletedIds } = graphManager.undoLastCommand();

		// Ensure that if any selected elements were deleted, they are no longer selected
		if (didUndo && deletedIds.length > 0) {
			for (const deletedId of deletedIds) {
				if (editorViewModel.isSelectedId(deletedId)) {
					editorViewModel.removeSelectedId(deletedId);
				}
			}
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
	function rotateComponent(
		id: number,
		rotateBy: number,
		apply: boolean = true,
	) {
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
	}

	return {
		deleteMulti,
		deleteComponent,
		deleteWire,
		deleteSelected,
		togglePower,
		updateTextFontSize,
		updateCustomDataMerged,
		updateTextAlignment,
		updateIoShowLabel,
		undo,
		rotateComponent,
	};
}

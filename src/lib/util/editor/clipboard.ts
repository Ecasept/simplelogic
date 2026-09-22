import { CommandGroup, RawAddCommand, type Command } from "../graph/commands";
import { snapshot } from "../shared/snapshot.svelte";
import { GRID_SIZE, mousePosition } from "../shared/global.svelte";
import type {
	ComponentData,
	ComponentHandle,
	GraphData,
	WireData,
	WireHandle,
	XYPair,
} from "../shared/types";
import type { GraphManager } from "../graph/graph.svelte";
import type { EditorViewModel, ElementType } from "./editorViewModel.svelte";
import type { CanvasViewModel } from "../interaction/canvasViewModel.svelte";
import type { InteractionController } from "../interaction/interaction.svelte";
type CloneEntry = [ComponentData, "component"] | [WireData, "wire"];

/** Owns the element clipboard, copying, ID remapping and duplication. */
export function createClipboardActions(
	graphManager: GraphManager,
	editorViewModel: EditorViewModel,
	canvasViewModel: CanvasViewModel,
	interactionController: InteractionController,
) {
	let clipboard: CloneEntry[] = [];

	function getBoundingBox(elements: CloneEntry[]) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const [element, type] of elements) {
			if (type === "component") {
				const { x, y } = element.position;
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x + element.size.x * GRID_SIZE);
				maxY = Math.max(maxY, y + element.size.y * GRID_SIZE);
			} else {
				for (const handle of Object.values(element.handles) as WireHandle[]) {
					minX = Math.min(minX, handle.x);
					minY = Math.min(minY, handle.y);
					maxX = Math.max(maxX, handle.x);
					maxY = Math.max(maxY, handle.y);
				}
			}
		}
		return { minX, minY, maxX, maxY };
	}

	function getCenter(elements: CloneEntry[]) {
		let xSum = 0;
		let ySum = 0;
		let count = 0;

		for (const [element, type] of elements) {
			if (type === "component") {
				const { x, y } = element.position;
				xSum += x;
				ySum += y;
				count++;
			} else {
				for (const handle of Object.values(element.handles) as WireHandle[]) {
					xSum += handle.x;
					ySum += handle.y;
					count++;
				}
			}
		}
		return { x: xSum / count, y: ySum / count };
	}

	function shiftBy(elements: CloneEntry[], offset: XYPair) {
		for (const [element, type] of elements) {
			if (type === "component") {
				element.position.x += offset.x;
				element.position.y += offset.y;
			} else {
				for (const handle of Object.values(element.handles) as WireHandle[]) {
					handle.x += offset.x;
					handle.y += offset.y;
				}
			}
		}
	}

	function getCopies(elements: Map<number, ElementType>, data: GraphData) {
		const selectedIds = new Set(elements.keys());
		const clones: CloneEntry[] = [];
		for (const [oldId, type] of elements) {
			const orig =
				type === "component" ? data.components[oldId] : data.wires[oldId];
			if (!orig) {
				continue;
			}

			const clone = snapshot(orig);

			// Filter connections to only those inside subset
			for (const handle of Object.values(clone.handles) as (
				| WireHandle
				| ComponentHandle
			)[]) {
				handle.connections = handle.connections.filter((c) =>
					selectedIds.has(c.id),
				);
			}
			clones.push([clone, type] as CloneEntry);
		}
		return clones;
	}

	function remapIds(clones: CloneEntry[], nextId: number) {
		const idMap = new Map<number, number>();
		for (const [clone] of clones) {
			idMap.set(clone.id, nextId++);
		}

		for (const [clone] of clones) {
			clone.id = idMap.get(clone.id)!;
			for (const handle of Object.values(clone.handles) as (
				| WireHandle
				| ComponentHandle
			)[]) {
				handle.connections = handle.connections
					.filter((c) => idMap.has(c.id))
					.map((c) => ({ ...c, id: idMap.get(c.id)! }));
			}
		}

		return [clones, idMap, nextId] as const;
	}

	function insert(clones: CloneEntry[], data: GraphData, nextId: number) {
		const commands: Command[] = [];
		for (const [clone, type] of clones) {
			commands.push(new RawAddCommand(type, clone, nextId));
		}

		if (commands.length === 0) {
			return;
		}
		const group = new CommandGroup(commands, "duplicate");
		graphManager.executeCommand(group);
		graphManager.applyChanges();
	}

	function selectAll(clones: CloneEntry[]) {
		const newSelection = new Map<number, ElementType>();
		for (const [clone, type] of clones) {
			newSelection.set(clone.id, type);
		}
		editorViewModel.setSelectedElements(newSelection);
	}

	function copySelected() {
		const uiState = editorViewModel.uiState;
		if (!interactionController.canStartElementInteraction) {
			return;
		}
		if (!("selected" in uiState) || uiState.selected.size === 0) {
			return;
		}
		const data = graphManager.getGraphData();

		const clones = getCopies(uiState.selected, data);
		clipboard = clones;
	}

	function pasteClipboard() {
		if (clipboard.length === 0) {
			return;
		}
		interactionController.cancel();
		const data = graphManager.getGraphData();

		const mpSVG = canvasViewModel.clientToSVGCoords(mousePosition);
		const { minX, minY, maxX, maxY } = getBoundingBox(clipboard);
		const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
		const offset = { x: mpSVG.x - center.x, y: mpSVG.y - center.y };
		// copy clipboard again to avoid mutating original clipboard entries with the offset
		const clones = structuredClone(clipboard) as CloneEntry[];
		const [remappedClones, _, nextId] = remapIds(clones, data.nextId);
		shiftBy(clones, offset);
		insert(remappedClones, data, nextId);
		selectAll(remappedClones);
	}

	function duplicateSelectedWithOffset() {
		const uiState = editorViewModel.uiState;
		if (!interactionController.canStartElementInteraction) {
			return;
		}
		if (!("selected" in uiState) || uiState.selected.size === 0) {
			return;
		}
		interactionController.cancel();
		const data = graphManager.getGraphData();

		const clones = getCopies(uiState.selected, data);
		const [remappedClones, _, nextId] = remapIds(clones, data.nextId);

		shiftBy(remappedClones, { x: GRID_SIZE, y: GRID_SIZE }); // Shift the duplicates by one grid cell to avoid exact overlap
		insert(remappedClones, data, nextId);
		selectAll(remappedClones);
	}

	function duplicateSelectedAndDrag() {
		const uiState = editorViewModel.uiState;
		if (!interactionController.canStartElementInteraction) {
			return;
		}
		if (!("selected" in uiState) || uiState.selected.size === 0) {
			return;
		}
		interactionController.cancel();
		const data = graphManager.getGraphData();

		const clones = getCopies(uiState.selected, data);
		const [remappedClones, _, nextId] = remapIds(clones, data.nextId);

		const mpSVG = canvasViewModel.clientToSVGCoords(mousePosition);
		const { minX, minY, maxX, maxY } = getBoundingBox(remappedClones);
		const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
		const offset = { x: mpSVG.x - center.x, y: mpSVG.y - center.y };
		shiftBy(remappedClones, offset);

		// Actually insert clones
		const commands: Command[] = [];
		for (const [clone, type] of remappedClones) {
			commands.push(new RawAddCommand(type, clone, nextId));
		}

		if (commands.length === 0) {
			return;
		}
		const group = new CommandGroup(commands, "duplicate");
		const elements = new Map<number, ElementType>();
		for (const [clone, type] of remappedClones) {
			elements.set(clone.id, type);
		}
		interactionController.addElements(elements, mpSVG, group);
	}

	return {
		get clipboard() {
			return clipboard;
		},
		set clipboard(value: CloneEntry[]) {
			clipboard = value;
		},
		getBoundingBox,
		getCenter,
		shiftBy,
		getCopies,
		remapIds,
		insert,
		selectAll,
		copySelected,
		pasteClipboard,
		duplicateSelectedWithOffset,
		duplicateSelectedAndDrag,
	};
}

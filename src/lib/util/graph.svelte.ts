import {
	CommandGroup,
	UpdateCustomDataCommand,
	type Command
} from "./commands";
import { GRID_SIZE, linesIntersect } from "./global.svelte";
import { mover } from "./move.svelte";
import {
	ZGraphData,
	type GraphData,
	type XYPair
} from "./types";
import type { AreaSelectType, TypedReference } from "./viewModels/editorViewModel.svelte";

export class GraphManager {
	/** Private state of the graph manager, that gets published with the notifyAll() method */
	private _graphData: GraphData = { components: {}, wires: {}, nextId: 0 };
	/** All commands that have been executed on the graph */
	private history: Command[] = [];
	/** All commands that have been executed since the last time the changes were applied.
	 * They can be applied to the graph or discarded.
	 */
	private changes: Command[] = [];

	/** Publicly exposed rune state for the graph manager, that updates whenever a series of commands has been executed.
	 * This ensures that edits to the graph that require multiple commands to be executed in one go
	 * only update the UI once instead of multiple times.
	 */
	public graphData: GraphData = $state({
		components: {},
		wires: {},
		nextId: 0,
	});

	public historyEmpty: boolean = $state(true);

	/** Executes a specified command on the graph data and adds it to the current changes.
	 *
	 * @param command The command to execute
	 * @param replace If true, the command will replace the last command in the history if it is of the same type.
	 * This is useful for commands like moving components, where we don't want thousands of move commands in the history.
	 * @returns The return value of the command's `execute` method
	 */
	executeCommand<C extends Command>(
		command: C,
		replace: boolean = false,
	): ReturnType<C["execute"]> {
		if (this.changes.length > 0) {
			const lastChange = this.changes[this.changes.length - 1];
			// If they are both command groups of the same type,
			const canReplace =
				lastChange instanceof CommandGroup &&
				command instanceof CommandGroup &&
				lastChange.type === command.type;
			if (replace && canReplace) {
				// If the command is replaceable and a previous command of the same type exists, undo it
				lastChange.undo(this._graphData);
				this.changes.pop();
			}
		}

		const res = command.execute(this._graphData);
		this.changes.push(command);

		return res;
	}

	/** Undoes the last command in the history, if there is one.
	 * @returns An object with the following properties:
	 * - `didUndo`: Whether a command existed to undo
	 * - `deletedIds`: An array of the IDs of the components and wires that were deleted by the command (empty if no command was undone)
	 */
	undoLastCommand() {
		const command = this.history.pop();
		if (command) {
			const deletedIds = command.undo(this._graphData);
			return { didUndo: true, deletedIds };
		}
		return { didUndo: false, deletedIds: [] };
	}

	/** Undoes the last move operation */
	undoLastMove() {
		if (this.changes.length !== 0) {
			const lastCommand = this.changes[this.changes.length - 1];
			if (lastCommand instanceof CommandGroup && lastCommand.type === "move") {
				lastCommand.undo(this._graphData);
				this.changes.pop();
			}
		}
	}

	/** Discards all changes that have been made since the last time the changes were applied. */
	discardChanges() {
		for (let i = this.changes.length - 1; i >= 0; i--) {
			this.changes[i].undo(this._graphData);
		}
		this.changes = [];
		mover.reset();
	}

	/** Applies all changes that have been made since the last time the changes were applied.
	 * This will add a new history entry with all the changes that have been made.
	 * This also means that these changes can't be discarded anymore but have to be undone.
	 */
	applyChanges() {
		const command =
			this.changes.length > 1
				? new CommandGroup(this.changes)
				: this.changes[0];
		this.history.push(command);
		this.changes = [];
		mover.reset();
	}

	/**
	 * Gets all elements (components and wires) that are in the specified area.
	 */
	getElementsInArea(startPos: XYPair, endPos: XYPair, type: AreaSelectType) {
		const x1 = Math.min(startPos.x, endPos.x);
		const x2 = Math.max(startPos.x, endPos.x);
		const y1 = Math.min(startPos.y, endPos.y);
		const y2 = Math.max(startPos.y, endPos.y);

		const selected: TypedReference[] = [];

		for (const compId in this._graphData.components) {
			const component = this._graphData.components[compId];
			const cx1 = component.position.x;
			const cy1 = component.position.y;
			const cx2 = component.position.x + component.size.x * GRID_SIZE;
			const cy2 = component.position.y + component.size.y * GRID_SIZE;
			if (type === "contain") {
				// Check if the component is fully contained in the selection area
				if (cx1 >= x1 && cx2 <= x2 && cy1 >= y1 && cy2 <= y2) {
					selected.push({ type: "component", id: component.id })
				}
			} else {
				// Check if the component intersects with the selection area
				if (cx1 < x2 && cx2 > x1 && cy1 < y2 && cy2 > y1) {
					selected.push({ type: "component", id: component.id })
				}
			}
		}
		console.log(this._graphData.wires);
		for (const wireId in this._graphData.wires) {
			const wire = this._graphData.wires[wireId];
			const startX = wire.handles.input.x;
			const startY = wire.handles.input.y;
			const endX = wire.handles.output.x;
			const endY = wire.handles.output.y;
			// Check if both handles are contained in the selection area
			// no `if (type === "contain")` check needed, as if the line is contained,
			// it is also intersecting
			if (
				startX >= x1 &&
				startX <= x2 &&
				startY >= y1 &&
				startY <= y2 &&
				endX >= x1 &&
				endX <= x2 &&
				endY >= y1 &&
				endY <= y2
			) {
				selected.push({ type: "wire", id: wire.id });
			} else if (type === "intersect") {
				const start = { x: startX, y: startY };
				const end = { x: endX, y: endY };
				if (linesIntersect(start, end, { x: x1, y: y1 }, { x: x2, y: y1 }) ||
					linesIntersect(start, end, { x: x2, y: y1 }, { x: x2, y: y2 }) ||
					linesIntersect(start, end, { x: x2, y: y2 }, { x: x1, y: y2 }) ||
					linesIntersect(start, end, { x: x1, y: y2 }, { x: x1, y: y1 })) {
					selected.push({ type: "wire", id: wire.id });
				}
			}
			console.log("selected:", selected);
		}
		return selected;
	}

	updateTextReplaceable(id: number, newText: string) {
		const component = this.getComponentData(id);
		if (!(component.type === "TEXT")) {
			console.error("Tried to update text of non-text component");
			return;
		}

		if (!this.historyEmpty) {
			const lastCommand = this.history[this.history.length - 1];
			if (
				lastCommand instanceof UpdateCustomDataCommand &&
				lastCommand.property === "text" &&
				lastCommand.componentId === id
			) {
				// If the last command was editing the same text,
				// undo it as we don't want the user to have to undo
				// every single character they type
				this.undoLastCommand();
			}
		}

		const oldText = component.customData?.text;
		if (oldText === newText) {
			return; // No change
		}
		const editTextCmd = new UpdateCustomDataCommand(id, "text", newText);
		this.executeCommand(editTextCmd, true);
		this.applyChanges();
	}

	getComponentData(id: number) {
		return this._graphData.components[id];
	}

	getWireData(id: number) {
		return this._graphData.wires[id];
	}

	getElementType(id: number) {
		if (this._graphData.components[id]) {
			return "component";
		}
		if (this._graphData.wires[id]) {
			return "wire";
		}
		return null;
	}

	getComponentDataReactive(id: number) {
		return this.graphData.components[id];
	}

	getWireDataReactive(id: number) {
		return this.graphData.wires[id];
	}

	getElementTypeReactive(id: number) {
		if (this.graphData.components[id]) {
			return "component";
		}
		if (this.graphData.wires[id]) {
			return "wire";
		}
		return null;
	}

	/** Parses the given data with zod and returns a valid graph data object if it is valid */
	validateData(data: GraphData) {
		return ZGraphData.safeParse(data);
	}

	/** Resets the current circuit to the initial state */
	clear() {
		this._graphData = { components: {}, wires: {}, nextId: 0 };
		this.history = [];
		this.changes = [];
		mover.reset();
	}

	notifyAll() {
		this.graphData = structuredClone(this._graphData);

		const val = this.history.length === 0;
		if (this.historyEmpty !== val) {
			this.historyEmpty = val;
		}
	}

	setGraphData(data: GraphData) {
		this._graphData = data;
	}
	getGraphData() {
		return this._graphData;
	}
}

import {
	CommandGroup,
	MoveComponentCommand,
	MoveWireHandleCommand,
	type Command,
} from "./commands";
import { calculateHandlePosition, isComponentHandleRef } from "./global.svelte";
import {
	ZGraphData,
	type GraphData,
	type HandleType,
	type XYPair,
} from "./types";

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
		// If the command is replaceable and a previous command of the same type exists, undo it
		if (replace && this.changes.length > 0) {
			const prevCommand = this.changes[this.changes.length - 1];
			if (prevCommand instanceof command.constructor) {
				prevCommand.undo(this._graphData);
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

	/** Discards all changes that have been made since the last time the changes were applied. */
	discardChanges() {
		for (let i = this.changes.length - 1; i >= 0; i--) {
			this.changes[i].undo(this._graphData);
		}
		this.changes = [];
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
	}

	/** Issues the correct commands
	 * to move the component with the given `componentId` to the new position `newComponentPos`.
	 * This will also move all connected wires to the new position.
	 */
	moveComponentReplaceable(newComponentPos: XYPair, componentId: number) {
		const cmds = [];
		const moveCmpCmd = new MoveComponentCommand(newComponentPos, componentId);
		cmds.push(moveCmpCmd);

		const cmp = this.getComponentData(componentId);

		for (const [id, handle] of Object.entries(cmp.handles)) {
			for (const connection of handle.connections) {
				const handlePos = calculateHandlePosition(
					handle.edge,
					handle.pos,
					cmp.size,
					newComponentPos,
					cmp.rotation,
				);
				const moveWireCmd = new MoveWireHandleCommand(
					handlePos,
					connection.handleType,
					connection.id,
				);
				cmds.push(moveWireCmd);
			}
		}
		const cmd = new CommandGroup(cmds);
		this.executeCommand(cmd, true);
	}

	/** Issues the correct commands
	 * to move the `draggedHandle` of the wire with the given `wireId` to the new position `newWirePos`.
	 * This will also move all connected wires to the new position.
	 */
	moveWireReplaceable(
		newWirePos: XYPair,
		draggedHandle: HandleType,
		wireId: number,
	) {
		const cmds = [];
		const moveWireCmd = new MoveWireHandleCommand(
			newWirePos,
			draggedHandle,
			wireId,
		);
		cmds.push(moveWireCmd);

		const wire = this.getWireData(wireId);

		const handle = wire.handles[draggedHandle];
		for (const connection of handle.connections) {
			if (isComponentHandleRef(connection)) {
				console.warn(
					"Tried to move wire handle connected to component - should not exist",
				);
				return;
			}
			const moveWireCmd = new MoveWireHandleCommand(
				{
					x: newWirePos.x,
					y: newWirePos.y,
				},
				connection.handleType,
				connection.id,
			);
			cmds.push(moveWireCmd);
		}
		const cmd = new CommandGroup(cmds);
		this.executeCommand(cmd, true);
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

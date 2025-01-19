import {
	CommandGroup,
	MoveComponentCommand,
	MoveWireConnectionCommand,
} from "./commands";
import { calculateHandleOffset, isComponentConnection } from "./global";
import type { Command, GraphData, HandleType, XYPair } from "./types";

export class Graph {
	private data: GraphData = { components: {}, wires: {}, nextId: 0 };

	getData() {
		return this.data;
	}

	setData(newData: GraphData, invalidateHistory: boolean) {
		this.data = newData;
		this.notifyAll(invalidateHistory);
	}

	// ==== Store Contract ====

	private subscribers: ((
		graphData: GraphData,
		invalidateHistory: boolean,
	) => void)[] = [];

	subscribe(
		subscriber: (graphData: GraphData, invalidateHistory: boolean) => void,
	): () => void {
		this.subscribers.push(subscriber);
		subscriber(this.data, false);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	private notifyAll(invalidateHistory: boolean) {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc(this.data, invalidateHistory);
		}
	}
}
export class GraphManager {
	private currentData: GraphData = { components: {}, wires: {}, nextId: 0 };
	private history: CommandGroup[] = [];
	private changes: Command[] = [];

	get hasChanges(): Readonly<boolean> {
		return this.changes.length > 0;
	}

	constructor(private graph: Graph) {
		graph.subscribe((newData: GraphData, invalidateHistory: boolean) => {
			this.currentData = newData;
			if (invalidateHistory) {
				this.history = [];
				this.changes = [];
			}
			this.notifyAll();
		});
	}

	executeCommand<C extends Command>(
		command: C,
		replace: boolean = false,
	): ReturnType<C["execute"]> {
		if (replace && this.hasChanges) {
			const prevCommand = this.changes[this.changes.length - 1];
			if (prevCommand instanceof command.constructor) {
				prevCommand.undo(this.currentData);
				this.changes.pop();
			}
		}

		const res = command.execute(this.currentData);

		this.changes.push(command);

		return res;
	}

	undoLastCommand() {
		const command = this.history.pop();
		command?.undo(this.currentData);
		this.notifyAll();
	}

	discardChanges() {
		for (let i = this.changes.length - 1; i >= 0; i--) {
			this.changes[i].undo(this.currentData);
		}
		this.changes = [];
		this.notifyAll();
	}
	commitChanges() {
		const group = new CommandGroup(this.changes);
		this.history.push(group);
		this.changes = [];
		this.graph.setData(structuredClone(this.currentData), false);
	}

	moveComponentReplaceable(newComponentPos: XYPair, componentId: number) {
		const cmds = [];
		const moveCmpCmd = new MoveComponentCommand(newComponentPos, componentId);
		cmds.push(moveCmpCmd);

		const cmp = this.getComponentData(componentId);

		for (const [id, handle] of Object.entries(cmp.handles)) {
			for (const connection of handle.connections) {
				const handleOffset = calculateHandleOffset(
					handle.edge,
					handle.pos,
					cmp.size,
				);
				const moveWireCmd = new MoveWireConnectionCommand(
					{
						x: newComponentPos.x + handleOffset.x,
						y: newComponentPos.y + handleOffset.y,
					},
					connection.handleType,
					connection.id,
				);
				cmds.push(moveWireCmd);
			}
		}
		const cmd = new CommandGroup(cmds);
		this.executeCommand(cmd, true);
	}

	moveWireReplaceable(
		newWirePos: XYPair,
		draggedHandle: HandleType,
		wireId: number,
	) {
		const cmds = [];
		const moveWireCmd = new MoveWireConnectionCommand(
			newWirePos,
			draggedHandle,
			wireId,
		);
		cmds.push(moveWireCmd);

		const wire = this.getWireData(wireId);

		const handle = wire[draggedHandle];
		for (const connection of handle.connections) {
			if (isComponentConnection(connection)) {
				console.warn(
					"Tried to move wire handle connected to component - should not exist",
				);
				return;
			}
			const moveWireCmd = new MoveWireConnectionCommand(
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
		return this.currentData.components[id];
	}

	getWireData(id: number) {
		return this.currentData.wires[id];
	}

	// ==== Store Contract ====

	private subscribers: ((graphData: GraphData) => void)[] = [];

	subscribe(subscriber: (graphData: GraphData) => void): () => void {
		this.subscribers.push(subscriber);
		subscriber(this.currentData);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	notifyAll() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc(this.currentData);
		}
	}
}

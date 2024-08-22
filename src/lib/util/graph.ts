import { get, writable } from "svelte/store";
import type { Command, GraphData, XYPair } from "./types";
import { calculateHandleOffset } from "./global";
import {
	CommandGroup,
	MoveComponentCommand,
	MoveWireConnectionCommand,
} from "./commands";

export class _Graph {
	data = writable<GraphData>({ components: {}, wires: {}, nextId: 0 });
	history = writable<Command[]>([]);

	executeCommand(command: Command) {
		this.data.update((data) => {
			command.execute(data);
			return data;
		});
		this.history.update((arr) => {
			arr.push(command);
			return arr;
		});
	}

	undoLastCommand() {
		this.history.update((arr) => {
			const command = arr.pop();
			this.data.update((data) => {
				command?.undo(data);
				return data;
			});
			return arr;
		});
	}

	loadGraph(graphData: GraphData) {
		this.data.set(graphData);
		this.history.set([]);
	}
	getGraph() {
		return get(this.data);
	}
}

export const graph = new _Graph();

export class _GraphManager {
	private currentData: GraphData = { components: {}, wires: {}, nextId: 0 };
	private history: Command[] = [];

	constructor() {
		graph.data.subscribe((data) => {
			this.currentData = structuredClone(data);
			this.history = [];
			this.notifyAll();
		});
	}
	executeCommand<C extends Command>(
		command: C,
		replace: boolean = false,
	): ReturnType<C["execute"]> {
		const prevCommand = this.history[this.history.length - 1];
		if (replace && prevCommand instanceof command.constructor) {
			prevCommand.undo(this.currentData);
			this.history.pop();
		}

		const res = command.execute(this.currentData);

		this.history.push(command);

		return res;
	}
	cancelChanges() {
		this.currentData = structuredClone(get(graph.data));
		this.history = [];
		this.notifyAll();
	}
	applyChanges() {
		const cmd = new CommandGroup(this.history);
		graph.executeCommand(cmd);
	}
	undo() {
		// Disable undo if currently editing
		if (this.history.length === 0) {
			graph.undoLastCommand();
		}
	}

	moveComponentReplaceable(
		newComponentPos: XYPair,
		componentId: number,
		componentSize: XYPair,
	) {
		const cmds = [];
		const moveCmpCmd = new MoveComponentCommand(newComponentPos, componentId);
		cmds.push(moveCmpCmd);

		const handles = this.currentData.components[componentId].handles;

		for (const [id, handle] of Object.entries(handles)) {
			if (handle.connection !== null) {
				const handleOffset = calculateHandleOffset(
					handle.edge,
					handle.pos,
					componentSize,
				);
				const moveWireCmd = new MoveWireConnectionCommand(
					{
						x: newComponentPos.x + handleOffset.x,
						y: newComponentPos.y + handleOffset.y,
					},
					handle.connection.handleType,
					handle.connection.id,
				);
				cmds.push(moveWireCmd);
			}
		}
		const cmd = new CommandGroup(cmds);
		this.executeCommand(cmd, true);
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

export const graphManager = new _GraphManager();

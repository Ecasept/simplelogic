import { CommandGroup, type Command } from "./commands";
import type { GraphData } from "./types";

/** Owns provisional commands until they become one undo entry or are cancelled. */
export class GraphEditTransaction {
	private commands: Command[] = [];
	private replacement: Command | null = null;
	private closed = false;

	constructor(
		private readonly graph: GraphData,
		private readonly publish: () => void,
		private readonly finish: (command?: Command) => void,
	) {}

	get active() {
		return !this.closed;
	}

	private assertActive() {
		if (this.closed)
			throw new Error("Graph edit transaction is already closed");
	}

	/** Append a fixed step, preserving earlier previews (e.g. rotate during placement). */
	append<C extends Command>(command: C): ReturnType<C["execute"]> {
		this.assertActive();
		const result = command.execute(this.graph);
		this.commands.push(command);
		this.replacement = null;
		this.publish();
		return result;
	}

	/** Add a preview that subsequent replacePreview calls can replace. */
	preview<C extends Command>(command: C): ReturnType<C["execute"]> {
		const result = this.append(command);
		this.replacement = command;
		return result;
	}

	/** Replace the last replaceable preview, without undoing preceding commands. */
	replacePreview(command: Command | null) {
		this.assertActive();
		const previous = this.replacement;
		if (previous) {
			previous.undo(this.graph);
			this.commands.pop();
		}
		this.replacement = null;
		try {
			if (command) {
				command.execute(this.graph);
				this.commands.push(command);
				this.replacement = command;
			}
		} catch (error) {
			if (previous) {
				previous.execute(this.graph);
				this.commands.push(previous);
				this.replacement = previous;
			}
			throw error;
		}
		this.publish();
	}

	commit() {
		if (this.closed) return;
		const command =
			this.commands.length > 1
				? new CommandGroup(this.commands)
				: this.commands[0];
		this.close(command);
	}

	cancel() {
		if (this.closed) return;
		for (let i = this.commands.length - 1; i >= 0; i--) {
			this.commands[i].undo(this.graph);
		}
		this.close();
	}

	private close(command?: Command) {
		this.closed = true;
		this.commands = [];
		this.replacement = null;
		this.finish(command);
		this.publish();
	}
}

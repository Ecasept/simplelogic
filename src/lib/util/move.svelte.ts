import { graphManager } from "./actions.svelte";
import {
	CommandGroup,
	MoveComponentAndWiresCommand,
	MoveWireHandleCommand,
	type Command,
} from "./commands";
import { gridSnap } from "./global.svelte";
import {
	newWireHandleRef,
	type WireData,
	type WireHandleReference,
	type XYPair,
} from "./types";
import type { ElementType } from "./viewModels/editorViewModel.svelte";

export class Mover {
	/**
	 * Used for move operations.
	 * Stores the positions of all elements being moved before the move operation.
	 *
	 * key is of format `id` for components and `wireId:handleType` for wire handles.
	 */
	private oldPositions: Map<string, XYPair> | null = null;
	private isFirstMove = true;
	private commands: Command[] = [];
	private changed: boolean = false;

	moveElementsReplaceable(offset: XYPair, elements: Map<number, ElementType>) {
		this.move(() => {
			for (const [id, type] of elements.entries()) {
				switch (type) {
					case "component":
						this._moveComponent(offset, id);
						break;
					case "wire":
						this._moveWire(offset, id, elements);
						break;
				}
			}
		});
		return this.changed;
	}

	moveWireHandleReplaceable(offset: XYPair, ref: WireHandleReference) {
		this.move(() => {
			const wireData = graphManager.getWireData(ref.id);
			this._moveWireHandle(offset, ref, wireData);
		});
		return this.changed;
	}

	private move(moveFn: () => void) {
		if (this.isFirstMove) {
			this.oldPositions = new Map();
		}
		this.commands = [];
		this.changed = false;
		moveFn();
		if (this.changed) {
			// Undo the last move command if it exists,
			// so that the user only has to undo once
			// instead of every single move command
			graphManager.undoLastMove();
			const group = new CommandGroup(this.commands, "move");
			graphManager.executeCommand(group, true);
			graphManager.notifyAll();
		}
		this.isFirstMove = false;
	}

	private _moveSingleWireHandle(
		offset: XYPair,
		ref: WireHandleReference,
		wireData: WireData,
	) {
		const handle = wireData.handles[ref.handleType];
		if (!handle) {
			console.error(
				`Tried to move wire handle ${ref.handleType} of wire ${ref.id}, but it does not exist.`,
			);
			return;
		}
		const currentPos = { x: handle.x, y: handle.y };
		const key = `${ref.id}:${ref.handleType}`;
		const [moved, newPos] = this.getNewPos(offset, currentPos, key);
		this.commands.push(
			new MoveWireHandleCommand(newPos, ref.handleType, ref.id),
		);
		this.changed ||= moved;
	}

	private _moveWireHandle(
		offset: XYPair,
		ref: WireHandleReference,
		wireData: WireData,
	) {
		this._moveSingleWireHandle(offset, ref, wireData);
		// Move all connections of the handle
		for (const connection of wireData.handles[ref.handleType].connections) {
			const data = graphManager.getWireData(connection.id);
			if (connection.type === "component") {
				console.error(
					"Tried to move a wire handle connected to a component, which is not supported.",
				);
				continue;
			}
			this._moveSingleWireHandle(offset, connection, data);
		}
	}
	private _moveWire(
		offset: XYPair,
		wireId: number,
		movedElements: Map<number, ElementType> = new Map(),
	) {
		const wireData = graphManager.getWireData(wireId);
		thisHandle: for (const handle of Object.values(wireData.handles)) {
			for (const connection of handle.connections) {
				// Don't move this handle if it is connected to a component.
				// Handles connected to componentes are only connected to one component,
				// which is why we don't need to have an additional loop checking this before
				// the loop actually moving the handle.
				if (connection.type === "component") continue thisHandle;
				if (movedElements.has(connection.id)) {
					// The connected element will/has already been moved,
					// so we don't need to move this connection
					continue;
				}
				const data = graphManager.getWireData(connection.id);
				this._moveSingleWireHandle(offset, connection, data);

				// Check if this is a multiconnected handle,
				// and if yes, move all other connections
				const otherHandle = graphManager.getWireData(connection.id).handles[
					connection.handleType
				];
				for (const otherConnection of otherHandle.connections) {
					if (otherConnection.type === "component") {
						// Shouldn't be able to happen
						continue thisHandle;
					}
					if (movedElements.has(otherConnection.id)) {
						// The connected element will/has already been moved,
						// so we don't need to move this connection
						continue;
					}
					const otherData = graphManager.getWireData(otherConnection.id);
					this._moveSingleWireHandle(offset, otherConnection, otherData);
				}
			}

			this._moveSingleWireHandle(
				offset,
				newWireHandleRef(wireId, handle.type),
				wireData,
			);
		}
	}
	private _moveComponent(offset: XYPair, componentId: number) {
		const componentData = graphManager.getComponentData(componentId);
		const currentPos = componentData.position;
		const key = `${componentId}`;
		const [moved, newPos] = this.getNewPos(offset, currentPos, key);
		this.commands.push(new MoveComponentAndWiresCommand(componentId, newPos));
		this.changed ||= moved;
	}

	private getNewPos(
		offset: XYPair,
		currentPos: XYPair,
		key: string,
	): [boolean, XYPair] {
		if (this.isFirstMove) {
			this.oldPositions!.set(key, currentPos);
		}

		const oldPos = this.oldPositions!.get(key)!;

		const newPos = {
			x: gridSnap(oldPos.x + offset.x),
			y: gridSnap(oldPos.y + offset.y),
		};

		// oldPos: Position before move operation began
		// currentPos: Position before this move command
		// newPos: Position after this move command
		if (currentPos.x === newPos.x && currentPos.y === newPos.y) {
			return [false, newPos]; // No change, graph doesn't need to be updated
		}

		// Indicate that at least one element has changed position
		// and we need to update the graph by executing the commands
		return [true, newPos];
	}

	reset() {
		this.oldPositions = null;
		this.isFirstMove = true;
	}
}

export const mover = new Mover();

import {
	CommandGroup,
	MoveComponentAndWiresCommand,
	MoveWireHandleCommand,
	type Command,
} from "./commands";
import {
	newWireHandleRef,
	type GraphData,
	type WireData,
	type WireHandleReference,
	type XYPair,
} from "./types";
import type { ElementType } from "./viewModels/editorViewModel.svelte";

export type MoveTargets = Map<number, ElementType> | WireHandleReference;

/** Plan absolute movement from an interaction snapshot without mutating either graph. */
export function planMove(
	graph: GraphData,
	origin: GraphData,
	targets: MoveTargets,
	offset: XYPair,
	snap: (value: number) => number,
) {
	return new MovePlanner(graph, origin, snap).plan(offset, targets);
}

class MovePlanner {
	private commands: Command[] = [];
	private changed = false;

	constructor(
		private readonly graph: GraphData,
		private readonly origin: GraphData,
		private readonly snap: (value: number) => number,
	) {}

	plan(offset: XYPair, targets: MoveTargets) {
		if (targets instanceof Map) {
			for (const [id, type] of targets) {
				if (type === "component") this._moveComponent(offset, id);
				else this._moveWire(offset, id, targets);
			}
		} else {
			this._moveWireHandle(offset, targets, this.graph.wires[targets.id]);
		}
		return { command: new CommandGroup(this.commands, "move"), changed: this.changed };
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
		const oldPos = this.origin.wires[ref.id].handles[ref.handleType];
		const [moved, newPos] = this.getNewPos(offset, currentPos, oldPos);
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
			if (connection.type === "component") {
				console.error(
					"Tried to move a wire handle connected to a component, which is not supported.",
				);
				continue;
			}
			this._moveSingleWireHandle(offset, connection, this.graph.wires[connection.id]);
		}
	}
	private _moveWire(
		offset: XYPair,
		wireId: number,
		movedElements: Map<number, ElementType> = new Map(),
	) {
		const wireData = this.graph.wires[wireId];
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
				const data = this.graph.wires[connection.id];
				this._moveSingleWireHandle(offset, connection, data);

				// Check if this is a multiconnected handle,
				// and if yes, move all other connections
				const otherHandle = this.graph.wires[connection.id].handles[
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
					const otherData = this.graph.wires[otherConnection.id];
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
		const componentData = this.graph.components[componentId];
		const currentPos = componentData.position;
		const oldPos = this.origin.components[componentId].position;
		const [moved, newPos] = this.getNewPos(offset, currentPos, oldPos);
		this.commands.push(new MoveComponentAndWiresCommand(componentId, newPos));
		this.changed ||= moved;
	}

	private getNewPos(
		offset: XYPair,
		currentPos: XYPair,
		oldPos: XYPair,
	): [boolean, XYPair] {
		const newPos = {
			x: this.snap(oldPos.x + offset.x),
			y: this.snap(oldPos.y + offset.y),
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

}

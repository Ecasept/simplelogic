import {
	entries,
	includesHandle,
	indexOfHandle,
	isComponentHandleRef,
	isWireHandleRef,
} from "./global.svelte";
import {
	newWireHandleRef,
	type ComponentData,
	type GraphData,
	type HandleReference,
	type HandleType,
	type ValidComponentInitData,
	type ValidWireInitData,
	type WireData,
	type XYPair,
} from "./types";

export interface Command {
	/** Executes the command on the given `graphData`. */
	execute: (graphData: GraphData) => any;
	/** Undoes the command on the given `graphData`.
	 * If the command cannot be undone, it prints an error to the console and does nothing.
	 * @returns An array of ids of elements that were **deleted** by the command, if any.
	 */
	undo: (graphData: GraphData) => number[];
}

export class CommandGroup implements Command {
	constructor(
		private commands: Command[],
		public type: string = "none",
	) {}
	execute(graphData: GraphData) {
		for (const command of this.commands) {
			command.execute(graphData);
		}
	}
	undo(graphData: GraphData) {
		const deletedIds = [];
		for (let i = this.commands.length - 1; i >= 0; i--) {
			const res = this.commands[i].undo(graphData);
			deletedIds.push(...res);
		}
		return deletedIds;
	}
}

/** Adds a one-sided connection in `from` that goes to `to`.
 * **This does not add the connection on the `to` side**.
 * @param index The index to insert the connection at. If not provided, the connection is added at the end.
 */
function connect(
	graphData: GraphData,
	from: HandleReference,
	to: HandleReference,
	index?: number,
) {
	// Don't allow connecting two components
	if (isComponentHandleRef(from) && isComponentHandleRef(to)) {
		throw new Error("Cannot connect two components");
	}
	// Don't allow connecting an already connected wire to a component
	if (isWireHandleRef(from) && isComponentHandleRef(to)) {
		const wireHandle = graphData.wires[from.id].handles[from.handleId];
		if (wireHandle.connections.length > 0) {
			throw new Error(
				"Can't connect component to wire with multiple connections (wire can either have multiple wires or 1 component connected to it)",
			);
		}
	}

	const list = isWireHandleRef(from) ? graphData.wires : graphData.components;
	const fromHandle = list[from.id].handles[from.handleId];
	if (includesHandle(fromHandle.connections, to)) {
		throw new Error("Connection already exists");
	}
	if (from.handleType === "input" && fromHandle.connections.length > 0) {
		throw new Error("Input may only have one connection");
	}
	if (from.handleType === to.handleType) {
		throw new Error("Cannot connect two inputs or two outputs");
	}
	if (index !== undefined) {
		fromHandle.connections.splice(index, 0, to);
	} else {
		// `to` can point to a component and therefore be a ComponentHandleRef,
		//  and if `fromHandle` also points to a component, `fromHandle.connections`
		// is a WireHandleRef[] (as components can only be connected to wires),
		// so a type error would occur.
		// However we ensure at runtime that `from` and `to` can't both point to components,
		// so we can safely assert the type here.
		(fromHandle.connections as HandleReference[]).push(to);
	}
}

/** Removes the connection entry from `from` that goes to `to`.
 * **This does not remove the connection on the `to` side**.
 *
 * @returns The index the connection was removed from.
 */
function disconnect(
	graphData: GraphData,
	from: HandleReference,
	to: HandleReference,
) {
	if (isComponentHandleRef(from)) {
		if (isComponentHandleRef(to)) {
			throw new Error("Two components can't be connected");
		}
	}
	const list = isWireHandleRef(from) ? graphData.wires : graphData.components;
	const fromHandle = list[from.id].handles[from.handleId];
	const index = indexOfHandle(fromHandle.connections, to);
	if (index === -1) {
		throw new Error("Connection does not exist");
	}
	fromHandle.connections.splice(index, 1);
	return index;
}

export class ConnectCommand implements Command {
	constructor(
		private from: HandleReference,
		private to: HandleReference,
	) {
		// disallow two components
		if (isComponentHandleRef(from) && isComponentHandleRef(to)) {
			throw new Error("Cannot connect two components");
		}
	}

	execute(graphData: GraphData) {
		connect(graphData, this.from, this.to);
		try {
			connect(graphData, this.to, this.from);
		} catch (e) {
			disconnect(graphData, this.from, this.to);
			throw e;
		}
	}

	undo(graphData: GraphData) {
		disconnect(graphData, this.from, this.to);
		try {
			disconnect(graphData, this.to, this.from);
		} catch (e) {
			connect(graphData, this.from, this.to);
			throw e;
		}
		return [];
	}
}

export class DisconnectCommand implements Command {
	toRefIndex: number | null = null;
	fromRefIndex: number | null = null;

	constructor(
		private from: HandleReference,
		private to: HandleReference,
	) {
		// disallow two components
		if (isComponentHandleRef(from) && isComponentHandleRef(to)) {
			throw new Error("Cannot connect two components");
		}
	}

	execute(graphData: GraphData) {
		this.toRefIndex = disconnect(graphData, this.from, this.to);
		try {
			this.fromRefIndex = disconnect(graphData, this.to, this.from);
		} catch (e) {
			connect(graphData, this.from, this.to);
			throw e;
		}
	}

	undo(graphData: GraphData) {
		if (this.toRefIndex === null || this.fromRefIndex === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}
		connect(graphData, this.from, this.to, this.toRefIndex);
		try {
			connect(graphData, this.to, this.from, this.fromRefIndex);
		} catch (e) {
			disconnect(graphData, this.from, this.to);
			throw e;
		}
		return [];
	}
}

export class MoveWireHandleCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private type: HandleType,
		private wireId: number,
	) {}

	execute(graphData: GraphData) {
		const wireRef = graphData.wires[this.wireId].handles[this.type];
		this.oldPosition = { x: wireRef.x, y: wireRef.y };
		wireRef.x = this.newPosition.x;
		wireRef.y = this.newPosition.y;
	}

	undo(graphData: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		// Set the wire handle back to its old position
		graphData.wires[this.wireId].handles[this.type].x = this.oldPosition.x;
		graphData.wires[this.wireId].handles[this.type].y = this.oldPosition.y;
		this.oldPosition = null;
		return [];
	}
}

export class MoveComponentCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private componentId: number,
	) {}

	execute(graphData: GraphData) {
		// Store the old position and set the new position
		this.oldPosition = structuredClone(
			graphData.components[this.componentId].position,
		);
		graphData.components[this.componentId].position = this.newPosition;
	}

	undo(graphData: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}
		graphData.components[this.componentId].position = this.oldPosition;
		this.oldPosition = null;
		return [];
	}
}
export class CreateWireCommand implements Command {
	oldNextId: number | null = null;

	/** @param newWireData The data for the new wire.
	 * This is not allowed to have an `id` field, as it is generated by the command.
	 * Additionally, the "input" and "output" fields must not contain any connections
	 * They should be added in a separate ConnectCommand.
	 */
	constructor(private newWireData: ValidWireInitData) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;

		// Add the wire to the graph data
		graphData.wires[graphData.nextId] = {
			...this.newWireData,
			id: graphData.nextId,
		};

		graphData.nextId++;
		return this.oldNextId;
	}
	undo(graphData: GraphData) {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		graphData.nextId = this.oldNextId;

		// Delete the wire
		delete graphData.wires[this.oldNextId];
		const deletedId = this.oldNextId;
		this.oldNextId = null;
		return [deletedId];
	}
}

export class CreateComponentCommand implements Command {
	oldNextId: number | null = null;

	/** @param newComponentData The data for the new component.
	 * This is not allowed to have an `id` field, as it is generated by the command.
	 * Additionally, no handle is allowed to have a connection. Any connections
	 * should be added in a separate ConnectCommand.
	 */
	constructor(private newComponentData: ValidComponentInitData) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;

		// Add the component to the graph data
		graphData.components[graphData.nextId] = {
			...this.newComponentData,
			id: graphData.nextId,
		};

		// Increment the next id
		graphData.nextId++;
		return this.oldNextId;
	}

	undo(graphData: GraphData) {
		if (this.oldNextId === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		graphData.nextId = this.oldNextId;

		// Delete the component
		delete graphData.components[this.oldNextId];

		const deletedId = this.oldNextId;
		this.oldNextId = null;
		return [deletedId];
	}
}

/** A superclass for commands that delete an element from the graph data.
 * The type of the element deletet must be specified in the constructor.
 */
export class DeleteElementCommand implements Command {
	deletedElement: ComponentData | WireData | null = null;
	disconnects: DisconnectCommand[] = [];

	constructor(
		private elementId: number,
		private elementType: "component" | "wire",
	) {}
	execute(graphData: GraphData) {
		const list =
			this.elementType === "component" ? graphData.components : graphData.wires;
		const element = list[this.elementId];

		// Disconnect all connections
		for (const [handleId, handle] of entries(element.handles)) {
			// Connection to this handle
			const thisRef: HandleReference =
				this.elementType == "component"
					? {
							id: this.elementId,
							handleId,
							handleType: handle.type,
							type: this.elementType,
						}
					: newWireHandleRef(this.elementId, handle.type);
			// Create a copy of connections to avoid modification during iteration
			const connections = [...handle.connections];
			for (const connection of connections) {
				const command = new DisconnectCommand(thisRef, connection);
				command.execute(graphData);
				this.disconnects.push(command);
			}
		}

		// Delete the component
		this.deletedElement = element;
		delete list[this.elementId];
	}

	undo(graphData: GraphData) {
		if (this.deletedElement === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		// Add the component back to the graph data
		const list =
			this.elementType === "component" ? graphData.components : graphData.wires;
		list[this.elementId] = this.deletedElement;

		// Undo disconnects in reverse order to restore connections properly
		for (const command of this.disconnects.toReversed()) {
			command.undo(graphData);
		}

		this.deletedElement = null;
		this.disconnects = [];
		return [];
	}
}

export class DeleteComponentCommand extends DeleteElementCommand {
	constructor(componentId: number) {
		super(componentId, "component");
	}
}

export class DeleteWireCommand extends DeleteElementCommand {
	constructor(wireId: number) {
		super(wireId, "wire");
	}
}

export class ToggleInputPowerStateCommand implements Command {
	constructor(private componentId: number) {}

	execute(graphData: GraphData) {
		graphData.components[this.componentId].isPoweredInitially =
			!graphData.components[this.componentId].isPoweredInitially;
	}

	undo(graphData: GraphData) {
		graphData.components[this.componentId].isPoweredInitially =
			!graphData.components[this.componentId].isPoweredInitially;
		return [];
	}
}

export class RotateComponentCommand implements Command {
	constructor(
		private componentId: number,
		private amount: number,
	) {}

	execute(graphData: GraphData) {
		const component = graphData.components[this.componentId];
		component.rotation = (component.rotation + this.amount + 360) % 360;
	}

	undo(graphData: GraphData) {
		const component = graphData.components[this.componentId];
		component.rotation = (component.rotation - this.amount + 360) % 360;
		return [];
	}
}

export class UpdateCustomDataCommand implements Command {
	private oldValue: unknown = null;

	constructor(
		public componentId: number,
		public property: string,
		private newValue: unknown,
	) {}

	execute(graphData: GraphData) {
		const component = graphData.components[this.componentId];
		if (!component) {
			throw new Error(`Component with id ${this.componentId} does not exist`);
		}

		// Initialize customData if it doesn't exist
		if (!component.customData) {
			component.customData = {};
		}

		// Store the old value for undo
		this.oldValue = component.customData[this.property];

		// Set the new value
		component.customData[this.property] = this.newValue;
	}

	undo(graphData: GraphData) {
		const component = graphData.components[this.componentId];
		if (!component) {
			console.error(`Component with id ${this.componentId} does not exist`);
			return [];
		}

		if (!component.customData) {
			console.error(`Component with id ${this.componentId} has no customData`);
			return [];
		}

		// Restore the old value
		if (this.oldValue === undefined) {
			delete component.customData[this.property];
		} else {
			component.customData[this.property] = this.oldValue;
		}

		return [];
	}
}

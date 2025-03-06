import {
	includesByValue,
	includesByValueMulti,
	indexOfByValue,
	indexOfByValueMulti,
	isComponentConnection,
} from "./global.svelte";
import {
	type ComponentConnection,
	type ComponentData,
	type GraphData,
	type HandleType,
	type WireConnection,
	type WireData,
	type XYPair,
} from "./types";

export interface Command {
	execute: (graphData: GraphData) => any;
	/** Undoes the command on the given `graphData`.
	 * If the command cannot be undone, it prints an error to the console and does nothing.
	 * @returns An array of ids of elements that were **deleted** by the command, if any.
	 */
	undo: (graphData: GraphData) => number[];
}

export class CommandGroup implements Command {
	constructor(private commands: Command[]) {}
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
	from: ComponentConnection | WireConnection,
	to: ComponentConnection | WireConnection,
	index?: number,
) {
	if (isComponentConnection(from)) {
		if (isComponentConnection(to)) {
			throw new Error("Cannot connect component to component");
		}
		const handle = graphData.components[from.id].handles[from.handleId];
		if (includesByValue(handle.connections, to)) {
			throw new Error("Connection already exists");
		}
		if (handle.type === "input" && handle.connections.length > 0) {
			throw new Error("Input may only have one connection");
		}
		if (handle.type === to.handleType) {
			throw new Error("Cannot connect two inputs or two outputs");
		}
		if (index !== undefined) {
			handle.connections.splice(index, 0, to);
		} else {
			handle.connections.push(to);
		}
	} else {
		const handle = graphData.wires[from.id][from.handleType];
		if (isComponentConnection(to)) {
			if (handle.connections.length > 0) {
				throw new Error(
					"Can't connect component to wire with multiple connections (wire can either have multiple wires or 1 component connected to it)",
				);
			}
			// Can't check if the connections are the same type
			// `to` is a componentConnection and doesn't have a handleType (only a handleId)
			if (index !== undefined) {
				handle.connections.splice(index, 0, to);
			} else {
				handle.connections.push(to);
			}
		} else {
			if (includesByValueMulti(handle.connections, to)) {
				throw new Error("Connection already exists");
			}
			if (from.handleType == to.handleType) {
				throw new Error("Cannot connect two inputs or two outputs");
			}
			if (from.handleType === "input" && handle.connections.length > 0) {
				throw new Error("Input may only have one connection");
			}
			if (index !== undefined) {
				handle.connections.splice(index, 0, to);
			} else {
				handle.connections.push(to);
			}
		}
	}
}

/** Removes the connection entry from `from` that goes to `to`.
 * **This does not remove the connection on the `to` side**.
 * @returns The index the connection was removed from.
 */
function disconnect(
	graphData: GraphData,
	from: ComponentConnection | WireConnection,
	to: ComponentConnection | WireConnection,
) {
	if (isComponentConnection(from)) {
		if (isComponentConnection(to)) {
			throw new Error("Two components can't be connected");
		}
		const handle = graphData.components[from.id].handles[from.handleId];
		const index = indexOfByValue(handle.connections, to);
		if (index === -1) {
			throw new Error("Connection does not exist");
		}
		handle.connections.splice(index, 1);
		return index;
	} else {
		const handle = graphData.wires[from.id][from.handleType];
		const index = indexOfByValueMulti(handle.connections, to);
		if (index === -1) {
			throw new Error("Connection does not exist");
		}
		handle.connections.splice(index, 1);
		return index;
	}
}

export class ConnectCommand implements Command {
	fromIndex: number | null = null;
	toIndex: number | null = null;

	constructor(
		private from: ComponentConnection | WireConnection,
		private to: ComponentConnection | WireConnection,
	) {
		// disallow two components
		if (isComponentConnection(from) && isComponentConnection(to)) {
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
	fromIndex: number | null = null;
	toIndex: number | null = null;

	constructor(
		private from: ComponentConnection | WireConnection,
		private to: ComponentConnection | WireConnection,
	) {
		// disallow two components
		if (isComponentConnection(from) && isComponentConnection(to)) {
			throw new Error("Cannot connect two components");
		}
	}

	execute(graphData: GraphData) {
		this.fromIndex = disconnect(graphData, this.from, this.to);
		try {
			this.toIndex = disconnect(graphData, this.to, this.from);
		} catch (e) {
			connect(graphData, this.from, this.to);
			throw e;
		}
	}

	undo(graphData: GraphData) {
		if (this.fromIndex === null || this.toIndex === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}
		connect(graphData, this.from, this.to, this.fromIndex);
		try {
			connect(graphData, this.to, this.from, this.toIndex);
		} catch (e) {
			disconnect(graphData, this.from, this.to);
			throw e;
		}
		return [];
	}
}

export class MoveWireConnectionCommand implements Command {
	oldPosition: XYPair | null = null;

	constructor(
		private newPosition: XYPair,
		private type: HandleType,
		private wireId: number,
	) {}

	execute(graphData: GraphData) {
		const wireConnection = graphData.wires[this.wireId][this.type];
		this.oldPosition = { x: wireConnection.x, y: wireConnection.y };
		wireConnection.x = this.newPosition.x;
		wireConnection.y = this.newPosition.y;
	}

	undo(graphData: GraphData) {
		if (this.oldPosition === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}
		graphData.wires[this.wireId][this.type].x = this.oldPosition.x;
		graphData.wires[this.wireId][this.type].y = this.oldPosition.y;
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

	constructor(private newWireData: Omit<WireData, "id">) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;
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
		delete graphData.wires[this.oldNextId];
		const deletedId = this.oldNextId;
		this.oldNextId = null;
		return [deletedId];
	}
}

export class CreateComponentCommand implements Command {
	oldNextId: number | null = null;

	constructor(private newComponentData: Omit<ComponentData, "id">) {}
	execute(graphData: GraphData) {
		this.oldNextId = graphData.nextId;
		graphData.components[graphData.nextId] = {
			...this.newComponentData,
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
		delete graphData.components[this.oldNextId];
		const deletedId = this.oldNextId;
		this.oldNextId = null;
		return [deletedId];
	}
}

export class DeleteComponentCommand implements Command {
	deletedComponent: ComponentData | null = null;
	disconnects: DisconnectCommand[] = [];

	constructor(private componentId: number) {}
	execute(graphData: GraphData) {
		const component = graphData.components[this.componentId];

		// Disconnect all connections
		for (const [handleId, handle] of Object.entries(component.handles)) {
			// Connection to this handle
			const thisConnection = {
				id: this.componentId,
				handleId,
			};
			// Create a copy of connections to avoid modification during iteration
			const connections = [...handle.connections];
			for (const connection of connections) {
				const command = new DisconnectCommand(thisConnection, connection);
				command.execute(graphData);
				this.disconnects.push(command);
			}
		}

		this.deletedComponent = component;
		delete graphData.components[this.componentId];
	}

	undo(graphData: GraphData) {
		if (this.deletedComponent === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		graphData.components[this.componentId] = this.deletedComponent;

		// Undo disconnects in reverse order to restore connections properly
		for (let i = this.disconnects.length - 1; i >= 0; i--) {
			this.disconnects[i].undo(graphData);
		}

		this.deletedComponent = null;
		this.disconnects = [];
		return [];
	}
}

export class DeleteWireCommand implements Command {
	deletedWire: WireData | null = null;
	disconnects: DisconnectCommand[] = [];

	constructor(private wireId: number) {}
	execute(graphData: GraphData) {
		const wire = graphData.wires[this.wireId];

		// Disconnect all connections
		const HANDLE_TYPES: HandleType[] = ["input", "output"];
		for (const type of HANDLE_TYPES) {
			// Connection to this handle
			const thisConnection = {
				id: this.wireId,
				handleType: type,
			};
			// Create a copy of connections to avoid modification during iteration
			const connections = [...wire[type].connections];
			for (const connection of connections) {
				const command = new DisconnectCommand(thisConnection, connection);
				command.execute(graphData);
				this.disconnects.push(command);
			}
		}

		this.deletedWire = wire;
		delete graphData.wires[this.wireId];
	}

	undo(graphData: GraphData) {
		if (this.deletedWire === null) {
			console.error(`Tried to undo command that has not been executed`);
			return [];
		}

		graphData.wires[this.wireId] = this.deletedWire;

		// Undo disconnects in reverse order to restore connections properly
		for (let i = this.disconnects.length - 1; i >= 0; i--) {
			this.disconnects[i].undo(graphData);
		}

		this.deletedWire = null;
		this.disconnects = [];
		return [];
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

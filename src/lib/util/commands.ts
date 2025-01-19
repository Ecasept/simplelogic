import {
	includesByValue,
	includesByValueMulti,
	indexOfByValue,
	indexOfByValueMulti,
	isComponentConnection,
	isWireConnection,
} from "./global";
import type {
	Command,
	ComponentConnection,
	ComponentData,
	GraphData,
	HandleType,
	WireConnection,
	WireData,
	XYPair,
} from "./types";

export class CommandGroup implements Command {
	constructor(private commands: Command[]) {}
	execute(graphData: GraphData) {
		for (const command of this.commands) {
			command.execute(graphData);
		}
	}
	undo(graphData: GraphData) {
		for (let i = this.commands.length - 1; i >= 0; i--) {
			this.commands[i].undo(graphData);
		}
	}
}

type ValidConnectConnections =
	| { from: WireConnection; to: WireConnection }
	| { from: WireConnection; to: ComponentConnection }
	| { from: ComponentConnection; to: WireConnection };

export class ConnectCommand implements Command {
	constructor(
		private from: ComponentConnection | WireConnection,
		private to: ComponentConnection | WireConnection,
	) {
		// disallow two components
		if (isComponentConnection(from) && isComponentConnection(to)) {
			throw new Error("Cannot connect two components");
		}
	}

	private connect(
		graphData: GraphData,
		from: ComponentConnection | WireConnection,
		to: ComponentConnection | WireConnection,
	) {
		if (isComponentConnection(from)) {
			const handle = graphData.components[from.id].handles[from.handleId];
			if (includesByValue(handle.connections, to as WireConnection)) {
				throw new Error("Connection already exists");
			}
			if (handle.type === "input" && handle.connections.length > 0) {
				throw new Error("Input may only have one connection");
			}
			if (handle.type === (to as WireConnection).handleType) {
				throw new Error("Cannot connect two inputs or two outputs");
			}
			handle.connections.push(to as WireConnection);
		} else {
			const handle = graphData.wires[from.id][from.handleType];
			if (isComponentConnection(to)) {
				if (handle.connections.length > 0) {
					throw new Error(
						"Can't connect component to wire with multiple connections (wire can either have multiple wires or 1 component connected to it)",
					);
				}
				// Can't check if the connections are the same type
				// to is a componentConnection and doesn't have a handleType (only a handleId)
				handle.connections.push(to);
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
				handle.connections.push(to);
			}
		}
	}

	execute(graphData: GraphData) {
		this.connect(graphData, this.from, this.to);
		this.connect(graphData, this.to, this.from);
	}

	private disconnect(
		graphData: GraphData,
		from: ComponentConnection | WireConnection,
		to: ComponentConnection | WireConnection,
	) {
		if (isComponentConnection(from)) {
			const handle = graphData.components[from.id].handles[from.handleId];
			const index = indexOfByValue(handle.connections, to as WireConnection);
			if (index === -1) {
				throw new Error("Connection does not exist");
			}
			handle.connections.splice(index, 1);
		} else {
			const handle = graphData.wires[from.id][from.handleType];
			const index = indexOfByValueMulti(handle.connections, to);
			if (index === -1) {
				throw new Error("Connection does not exist");
			}
			handle.connections.splice(index, 1);
		}
	}

	undo(graphData: GraphData) {
		this.disconnect(graphData, this.from, this.to);
		this.disconnect(graphData, this.to, this.from);
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
			return;
		}
		graphData.wires[this.wireId][this.type].x = this.oldPosition.x;
		graphData.wires[this.wireId][this.type].y = this.oldPosition.y;
		this.oldPosition = null;
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
			return;
		}
		graphData.components[this.componentId].position = this.oldPosition;
		this.oldPosition = null;
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
			return;
		}

		graphData.nextId = this.oldNextId;
		delete graphData.wires[this.oldNextId];

		this.oldNextId = null;
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
			return;
		}

		graphData.nextId = this.oldNextId;
		delete graphData.components[this.oldNextId];
		this.oldNextId = null;
	}
}

export class DeleteComponentCommand implements Command {
	deletedComponent: ComponentData | null = null;
	changedWires: { [id: number]: WireData } = {};
	changedComponents: { [id: number]: ComponentData } = {};

	constructor(private componentId: number) {}
	execute(graphData: GraphData) {
		const component = graphData.components[this.componentId];
		this.deletedComponent = component;
		delete graphData.components[this.componentId];

		for (const [handleId, handle] of Object.entries(component.handles)) {
			for (const connection of handle.connections) {
				const otherWire = graphData.wires[connection.id];
				this.changedWires[connection.id] = structuredClone(otherWire);

				const otherHandle = otherWire[connection.handleType];
				// Filter out connection to this component
				otherHandle.connections = otherHandle.connections.filter(
					(c) =>
						!(
							isComponentConnection(c) &&
							c.id == this.componentId &&
							c.handleId == handleId
						),
				);
			}
		}
	}

	undo(graphData: GraphData) {
		if (this.deletedComponent === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		graphData.components[this.componentId] = this.deletedComponent;

		for (const [wireId, wireData] of Object.entries(this.changedWires)) {
			graphData.wires[Number(wireId)] = wireData;
		}
		for (const [componentId, componentData] of Object.entries(
			this.changedComponents,
		)) {
			graphData.components[Number(componentId)] = componentData;
		}

		this.deletedComponent = null;
		this.changedWires = {};
		this.changedComponents = {};
	}
}

export class DeleteWireCommand implements Command {
	deletedWire: WireData | null = null;
	changedWires: { [id: number]: WireData } = {};
	changedComponents: { [id: number]: ComponentData } = {};

	constructor(private wireId: number) {}
	execute(graphData: GraphData) {
		const wire = graphData.wires[this.wireId];
		this.deletedWire = wire;
		delete graphData.wires[this.wireId];

		const HANDLE_TYPES: HandleType[] = ["input", "output"];
		for (const type of HANDLE_TYPES) {
			for (const connection of wire[type].connections) {
				if (isComponentConnection(connection)) {
					const otherComponent = graphData.components[connection.id];
					this.changedComponents[connection.id] =
						structuredClone(otherComponent);

					const otherHandle = otherComponent.handles[connection.handleId];
					// Filter out connection to this wire
					otherHandle.connections = otherHandle.connections.filter(
						(c) => !(c.id == this.wireId && c.handleType == type),
					);
				} else {
					const otherWire = graphData.wires[connection.id];
					this.changedWires[connection.id] = structuredClone(otherWire);

					const otherHandle = otherWire[connection.handleType];
					// Filter out connection to this wire
					otherHandle.connections = otherHandle.connections.filter(
						(c) =>
							!(
								isWireConnection(c) &&
								c.id == this.wireId &&
								c.handleType == type
							),
					);
				}
			}
		}
	}

	undo(graphData: GraphData) {
		if (this.deletedWire === null) {
			console.error(`Tried to undo command that has not been executed`);
			return;
		}

		graphData.wires[this.wireId] = this.deletedWire;

		for (const [wireId, wireData] of Object.entries(this.changedWires)) {
			graphData.wires[Number(wireId)] = wireData;
		}
		for (const [componentId, componentData] of Object.entries(
			this.changedComponents,
		)) {
			graphData.components[Number(componentId)] = componentData;
		}

		this.deletedWire = null;
		this.changedWires = {};
		this.changedComponents = {};
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
	}
}

import { isComponentConnection } from "./global";
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
	oldFrom: ComponentConnection | WireConnection | null = null;
	oldTo: ComponentConnection | WireConnection | null = null;

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
		if (isComponentConnection(this.from)) {
			const handle =
				graphData.components[this.from.id].handles[this.from.handleId];
			this.oldFrom = handle.connection;
			handle.connection = this.to as WireConnection;
		} else {
			const handle = graphData.wires[this.from.id][this.from.handleType];
			this.oldFrom = handle.connection;
			handle.connection = this.to;
		}
		if (isComponentConnection(this.to)) {
			const handle = graphData.components[this.to.id].handles[this.to.handleId];
			this.oldTo = handle.connection;
			handle.connection = this.from as WireConnection;
		} else {
			const handle = graphData.wires[this.to.id][this.to.handleType];
			this.oldTo = handle.connection;
			handle.connection = this.from;
		}
	}
	undo(graphData: GraphData) {
		if (isComponentConnection(this.from)) {
			const handle =
				graphData.components[this.from.id].handles[this.from.handleId];
			handle.connection = this.oldFrom as WireConnection;
		} else {
			const handle = graphData.wires[this.from.id][this.from.handleType];
			handle.connection = this.oldFrom;
		}
		if (isComponentConnection(this.to)) {
			const handle = graphData.components[this.to.id].handles[this.to.handleId];
			handle.connection = this.oldTo as WireConnection;
		} else {
			const handle = graphData.wires[this.to.id][this.to.handleType];
			handle.connection = this.oldTo;
		}
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
	changedHandles: { [id: number]: ComponentData } = {};

	constructor(private componentId: number) {}
	execute(graphData: GraphData) {
		this.deletedComponent = graphData.components[this.componentId];
		delete graphData.components[this.componentId];

		for (const wireId in graphData.wires) {
			const wire = graphData.wires[wireId];
			for (const handleType of [wire.input, wire.output]) {
				if (handleType.connection?.id === this.componentId) {
					this.changedWires[wire.id] = structuredClone(wire);
					handleType.connection = null;
				}
			}
		}
		for (const componentId in graphData.components) {
			const component = graphData.components[componentId];
			for (const handleName in component.handles) {
				const handle = component.handles[handleName];
				if (handle.connection?.id === this.componentId) {
					this.changedHandles[component.id] = structuredClone(component);
					handle.connection = null;
				}
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
			this.changedHandles,
		)) {
			graphData.components[Number(componentId)] = componentData;
		}

		this.deletedComponent = null;
		this.changedWires = {};
		this.changedHandles = {};
	}
}

export class DeleteWireCommand implements Command {
	deletedWire: WireData | null = null;
	changedWires: { [id: number]: WireData } = {};
	changedHandles: { [id: number]: ComponentData } = {};

	constructor(private wireId: number) {}
	execute(graphData: GraphData) {
		this.deletedWire = graphData.wires[this.wireId];
		delete graphData.wires[this.wireId];

		for (const wireId in graphData.wires) {
			const wire = graphData.wires[wireId];
			for (const handleType of [wire.input, wire.output]) {
				if (handleType.connection?.id === this.wireId) {
					this.changedWires[wire.id] = structuredClone(wire);
					handleType.connection = null;
				}
			}
		}
		for (const componentId in graphData.components) {
			const component = graphData.components[componentId];
			for (const handleName in component.handles) {
				const handle = component.handles[handleName];
				if (handle.connection?.id === this.wireId) {
					this.changedHandles[component.id] = structuredClone(component);
					handle.connection = null;
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
			this.changedHandles,
		)) {
			graphData.components[Number(componentId)] = componentData;
		}

		this.deletedWire = null;
		this.changedWires = {};
		this.changedHandles = {};
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

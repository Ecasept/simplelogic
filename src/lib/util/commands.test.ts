import { beforeEach, describe, expect, it } from "vitest";
import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	MoveComponentCommand,
	MoveWireConnectionCommand,
} from "./commands";
import { GRID_SIZE } from "./global";
import type {
	ComponentConnection,
	ComponentData,
	GraphData,
	WireConnection,
	WireData,
	XYPair,
} from "./types";

describe("Command Tests", () => {
	let graphData: GraphData;

	beforeEach(() => {
		graphData = {
			components: {},
			wires: {},
			nextId: 0,
		};
	});

	describe("CommandGroup", () => {
		it("should execute and undo multiple commands", () => {
			const cmd1 = new CreateComponentCommand({
				type: "AND",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
				isPoweredInitially: false,
			});
			const cmd2 = new CreateComponentCommand({
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: 20 * GRID_SIZE, y: 11 * GRID_SIZE },
				handles: {},
				isPoweredInitially: false,
			});
			const group = new CommandGroup([cmd1, cmd2]);

			group.execute(graphData);
			expect(Object.keys(graphData.components).length).toBe(2);

			group.undo(graphData);
			expect(Object.keys(graphData.components).length).toBe(0);
		});
	});

	describe("ConnectCommand", () => {
		it("should not allow connecting two components", () => {
			const fromId = 1;
			const toId = 30;
			graphData.components[toId] = {
				id: toId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: 2 * GRID_SIZE, y: 3 * GRID_SIZE },
				handles: {
					in: { edge: "left", pos: 3, type: "input", connections: [] },
				},
				isPoweredInitially: false,
			};
			graphData.components[fromId] = {
				id: fromId,
				type: "AND",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {
					out: { edge: "bottom", pos: 100, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			const from: ComponentConnection = { id: fromId, handleId: "out" };
			const to: ComponentConnection = { id: toId, handleId: "in" };
			expect(() => new ConnectCommand(from, to)).toThrow();
		});
		it("should connect and disconnect wire and component", () => {
			const fromId = 100;
			const toId = 1;
			graphData.components[fromId] = {
				id: fromId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};
			graphData.wires[toId] = {
				id: toId,
				input: { x: 100 * GRID_SIZE, y: 2 * GRID_SIZE, connections: [] },
				output: { x: 0, y: GRID_SIZE, connections: [] },
			};

			const from: ComponentConnection = { id: fromId, handleId: "out" };
			const to: WireConnection = { id: toId, handleType: "input" };
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.components[fromId].handles["out"].connections).toEqual([
				to,
			]);
			expect(graphData.wires[toId].input.connections).toEqual([from]);

			cmd.undo(graphData);
			expect(
				graphData.components[fromId].handles["out"].connections,
			).toHaveLength(0);
			expect(graphData.wires[toId].input.connections).toHaveLength(0);
		});
		it("should connect and disconnect wires", () => {
			const fromId = 79;
			const toId = 4000;
			graphData.wires[fromId] = {
				id: fromId,
				input: { x: 100 * GRID_SIZE, y: 2 * GRID_SIZE, connections: [] },
				output: { x: 0, y: 4 * GRID_SIZE, connections: [] },
			};
			graphData.wires[toId] = {
				id: toId,
				input: { x: 101 * GRID_SIZE, y: 3 * GRID_SIZE, connections: [] },
				output: { x: GRID_SIZE, y: 2 * GRID_SIZE, connections: [] },
			};

			const from: WireConnection = { id: fromId, handleType: "output" };
			const to: WireConnection = { id: toId, handleType: "input" };
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.wires[fromId].output.connections).toEqual([to]);
			expect(graphData.wires[toId].input.connections).toEqual([from]);

			cmd.undo(graphData);
			expect(graphData.wires[fromId].output.connections).toHaveLength(0);
			expect(graphData.wires[toId].input.connections).toHaveLength(0);
		});
		it("should allow multiple wire connections from component output", () => {
			const componentId = 1;
			const wire1Id = 2;
			const wire2Id = 3;

			graphData.components[componentId] = {
				id: componentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				input: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: GRID_SIZE, connections: [] },
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				input: { x: 2 * GRID_SIZE, y: 2 * GRID_SIZE, connections: [] },
				output: { x: 0, y: 2 * GRID_SIZE, connections: [] },
			};

			const from: ComponentConnection = { id: componentId, handleId: "out" };
			const to1: WireConnection = { id: wire1Id, handleType: "input" };
			const to2: WireConnection = { id: wire2Id, handleType: "input" };

			const cmd1 = new ConnectCommand(from, to1);
			const cmd2 = new ConnectCommand(from, to2);

			cmd1.execute(graphData);
			cmd2.execute(graphData);

			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([to1, to2]);
		});

		it("should error when mixing wire and component connections on output", () => {
			const componentId = 1;
			const wireId = 2;
			const otherComponentId = 3;

			graphData.components[componentId] = {
				id: componentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			graphData.wires[wireId] = {
				id: wireId,
				input: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: GRID_SIZE, connections: [] },
			};

			graphData.components[otherComponentId] = {
				id: otherComponentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: 3 * GRID_SIZE, y: GRID_SIZE },
				handles: {
					in: { edge: "left", pos: 3, type: "input", connections: [] },
				},
				isPoweredInitially: false,
			};

			const from: ComponentConnection = { id: componentId, handleId: "out" };
			const toWire: WireConnection = { id: wireId, handleType: "input" };
			const toComponent: ComponentConnection = {
				id: otherComponentId,
				handleId: "in",
			};

			const cmd1 = new ConnectCommand(from, toWire);
			cmd1.execute(graphData);

			expect(() => new ConnectCommand(from, toComponent)).toThrow();
		});

		it("should error when adding multiple connections to input", () => {
			const wire1Id = 1;
			const wire2Id = 2;
			const componentId = 3;

			graphData.components[componentId] = {
				id: componentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					in: { edge: "left", pos: 3, type: "input", connections: [] },
				},
				isPoweredInitially: false,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				input: { x: 0, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: 2 * GRID_SIZE, connections: [] },
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				input: { x: 0, y: 3 * GRID_SIZE, connections: [] },
				output: { x: 0, y: 4 * GRID_SIZE, connections: [] },
			};

			const to: ComponentConnection = { id: componentId, handleId: "in" };
			const from1: WireConnection = { id: wire1Id, handleType: "output" };
			const from2: WireConnection = { id: wire2Id, handleType: "output" };

			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(
				graphData.components[componentId].handles["in"].connections,
			).toEqual([from1]);
		});
		it("should correctly undo multiple connections from output", () => {
			const componentId = 1;
			const wire1Id = 2;
			const wire2Id = 3;

			graphData.components[componentId] = {
				id: componentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				input: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: GRID_SIZE, connections: [] },
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				input: { x: 2 * GRID_SIZE, y: 2 * GRID_SIZE, connections: [] },
				output: { x: 0, y: 2 * GRID_SIZE, connections: [] },
			};

			const from: ComponentConnection = { id: componentId, handleId: "out" };
			const to1: WireConnection = { id: wire1Id, handleType: "input" };
			const to2: WireConnection = { id: wire2Id, handleType: "input" };

			const cmd1 = new ConnectCommand(from, to1);
			const cmd2 = new ConnectCommand(from, to2);

			cmd1.execute(graphData);
			cmd2.execute(graphData);

			// Verify both connections are present
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([to1, to2]);
			expect(graphData.wires[wire1Id].input.connections).toEqual([from]);
			expect(graphData.wires[wire2Id].input.connections).toEqual([from]);

			// Undo second connection
			cmd2.undo(graphData);
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([to1]);
			expect(graphData.wires[wire1Id].input.connections).toEqual([from]);
			expect(graphData.wires[wire2Id].input.connections).toHaveLength(0);

			// Undo first connection
			cmd1.undo(graphData);
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toHaveLength(0);
			expect(graphData.wires[wire1Id].input.connections).toHaveLength(0);
			expect(graphData.wires[wire2Id].input.connections).toHaveLength(0);
		});
		it("should error when connecting to a wire that already has a connection", () => {
			const wire1Id = 1;
			const component1Id = 2;
			const component2Id = 3;

			// Set up first component
			graphData.components[component1Id] = {
				id: component1Id,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			// Set up second component
			graphData.components[component2Id] = {
				id: component2Id,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: 3 * GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connections: [] },
				},
				isPoweredInitially: false,
			};

			// Set up wire
			graphData.wires[wire1Id] = {
				id: wire1Id,
				input: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: GRID_SIZE, connections: [] },
			};

			// Create connections
			const from1: ComponentConnection = { id: component1Id, handleId: "out" };
			const from2: ComponentConnection = { id: component2Id, handleId: "out" };
			const to: WireConnection = { id: wire1Id, handleType: "input" };

			// Connect first component to wire
			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			// Try to connect second component to the same wire - should throw
			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[wire1Id].input.connections).toEqual([from1]);
		});
		it("should error when connecting to a component handle that already has the same connection", () => {
			const componentId = 1;
			const wire1Id = 2;

			// Set up component
			graphData.components[componentId] = {
				id: componentId,
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					in: { edge: "left", pos: 3, type: "input", connections: [] },
				},
				isPoweredInitially: false,
			};

			// Set up first wire
			graphData.wires[wire1Id] = {
				id: wire1Id,
				input: { x: 0, y: GRID_SIZE, connections: [] },
				output: { x: 0, y: 2 * GRID_SIZE, connections: [] },
			};

			// Create connections
			const to: ComponentConnection = { id: componentId, handleId: "in" };
			const from1: WireConnection = { id: wire1Id, handleType: "output" };
			const from2: WireConnection = { id: wire1Id, handleType: "output" };

			// Connect first wire
			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			// Try to connect second wire to same component input - should throw
			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(
				graphData.components[componentId].handles["in"].connections,
			).toEqual([from1]);
		});
		it("should error when connecting multiple components to a wire output", () => {
			const wireId = 1;
			const component1Id = 2;
			const component2Id = 3;

			graphData.wires[wireId] = createMockWire(wireId);
			graphData.components[component1Id] = createMockComponent(component1Id);
			graphData.components[component2Id] = createMockComponent(component2Id);

			const from: WireConnection = { id: wireId, handleType: "output" };
			const to1: ComponentConnection = { id: component1Id, handleId: "in1" };
			const to2: ComponentConnection = { id: component2Id, handleId: "in1" };

			const cmd1 = new ConnectCommand(from, to1);
			cmd1.execute(graphData);

			// Try to connect second component to the same wire output - should throw
			const cmd2 = new ConnectCommand(from, to2);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[wireId].output.connections).toEqual([to1]);
			expect(
				graphData.components[component1Id].handles.in1.connections,
			).toEqual([from]);
			expect(
				graphData.components[component2Id].handles.in1.connections,
			).toHaveLength(0);
		});

		it("should error when connecting a wire and component to a wire output", () => {
			const sourceWireId = 1;
			const targetWireId = 2;
			const componentId = 3;

			graphData.wires[sourceWireId] = createMockWire(sourceWireId);
			graphData.wires[targetWireId] = createMockWire(targetWireId);
			graphData.components[componentId] = createMockComponent(componentId);

			const from: WireConnection = { id: sourceWireId, handleType: "output" };
			const toWire: WireConnection = { id: targetWireId, handleType: "input" };
			const toComponent: ComponentConnection = {
				id: componentId,
				handleId: "in1",
			};

			const cmd1 = new ConnectCommand(from, toWire);
			cmd1.execute(graphData);

			// Try to connect component to wire output that already has a wire connection
			const cmd2 = new ConnectCommand(from, toComponent);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[sourceWireId].output.connections).toEqual([
				toWire,
			]);
			expect(graphData.wires[targetWireId].input.connections).toEqual([from]);
			expect(
				graphData.components[componentId].handles.in1.connections,
			).toHaveLength(0);
		});

		it("should connect multiple wires to a wire output", () => {
			const sourceWireId = 1;
			const targetWire1Id = 2;
			const targetWire2Id = 3;

			graphData.wires[sourceWireId] = createMockWire(sourceWireId);
			graphData.wires[targetWire1Id] = createMockWire(targetWire1Id);
			graphData.wires[targetWire2Id] = createMockWire(targetWire2Id);

			const from: WireConnection = { id: sourceWireId, handleType: "output" };
			const to1: WireConnection = { id: targetWire1Id, handleType: "input" };
			const to2: WireConnection = { id: targetWire2Id, handleType: "input" };

			const cmd1 = new ConnectCommand(from, to1);
			const cmd2 = new ConnectCommand(from, to2);

			cmd1.execute(graphData);
			cmd2.execute(graphData);

			// Verify both connections are present
			expect(graphData.wires[sourceWireId].output.connections).toEqual([
				to1,
				to2,
			]);
			expect(graphData.wires[targetWire1Id].input.connections).toEqual([from]);
			expect(graphData.wires[targetWire2Id].input.connections).toEqual([from]);

			// Test undo operations
			cmd2.undo(graphData);
			expect(graphData.wires[sourceWireId].output.connections).toEqual([to1]);
			expect(graphData.wires[targetWire1Id].input.connections).toEqual([from]);
			expect(graphData.wires[targetWire2Id].input.connections).toHaveLength(0);

			cmd1.undo(graphData);
			expect(graphData.wires[sourceWireId].output.connections).toHaveLength(0);
			expect(graphData.wires[targetWire1Id].input.connections).toHaveLength(0);
			expect(graphData.wires[targetWire2Id].input.connections).toHaveLength(0);
		});
		it("should error when connecting two wire inputs or outputs", () => {
			const wire1Id = 1;
			const wire2Id = 2;

			graphData.wires[wire1Id] = createMockWire(wire1Id);
			graphData.wires[wire2Id] = createMockWire(wire2Id);

			// Try to connect input to input
			const input1: WireConnection = { id: wire1Id, handleType: "input" };
			const input2: WireConnection = { id: wire2Id, handleType: "input" };
			const cmd1 = new ConnectCommand(input1, input2);
			expect(() => cmd1.execute(graphData)).toThrow();

			// Try to connect output to output
			const output1: WireConnection = { id: wire1Id, handleType: "output" };
			const output2: WireConnection = { id: wire2Id, handleType: "output" };
			const cmd2 = new ConnectCommand(output1, output2);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify no connections were made
			expect(graphData.wires[wire1Id].input.connections).toHaveLength(0);
			expect(graphData.wires[wire1Id].output.connections).toHaveLength(0);
			expect(graphData.wires[wire2Id].input.connections).toHaveLength(0);
			expect(graphData.wires[wire2Id].output.connections).toHaveLength(0);
		});

		it("should error when connecting multiple wires to wire input", () => {
			const targetWireId = 1;
			const sourceWire1Id = 2;
			const sourceWire2Id = 3;

			graphData.wires[targetWireId] = createMockWire(targetWireId);
			graphData.wires[sourceWire1Id] = createMockWire(sourceWire1Id);
			graphData.wires[sourceWire2Id] = createMockWire(sourceWire2Id);

			const to: WireConnection = { id: targetWireId, handleType: "input" };
			const from1: WireConnection = { id: sourceWire1Id, handleType: "output" };
			const from2: WireConnection = { id: sourceWire2Id, handleType: "output" };

			// Connect first wire
			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			// Try to connect second wire to same input - should throw
			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only first connection remains
			expect(graphData.wires[targetWireId].input.connections).toEqual([from1]);
			expect(graphData.wires[sourceWire1Id].output.connections).toEqual([to]);
			expect(graphData.wires[sourceWire2Id].output.connections).toHaveLength(0);
		});
	});

	describe("MoveWireConnectionCommand", () => {
		it("should move wire connection", () => {
			const id = 32;
			graphData.wires[id] = {
				id: id,
				input: { x: GRID_SIZE, y: 2000 * GRID_SIZE, connections: [] },
				output: { x: 0, y: 30 * GRID_SIZE, connections: [] },
			};
			const newPosition: XYPair = { x: 1000 * GRID_SIZE, y: 999 * GRID_SIZE };
			const cmd = new MoveWireConnectionCommand(newPosition, "input", id);

			cmd.execute(graphData);
			expect(graphData.wires[id].input.x).toBe(1000 * GRID_SIZE);
			expect(graphData.wires[id].input.y).toBe(999 * GRID_SIZE);

			expect(graphData.wires[id].output.x).toBe(0);
			expect(graphData.wires[id].output.y).toBe(30 * GRID_SIZE);

			cmd.undo(graphData);
			expect(graphData.wires[id].input.x).toBe(GRID_SIZE);
			expect(graphData.wires[id].input.y).toBe(2000 * GRID_SIZE);

			expect(graphData.wires[id].output.x).toBe(0);
			expect(graphData.wires[id].output.y).toBe(30 * GRID_SIZE);
		});
	});

	describe("MoveComponentCommand", () => {
		it("should move component", () => {
			graphData.components[3] = {
				id: 3,
				type: "AND",
				size: { x: 4, y: 1000 },
				position: { x: GRID_SIZE, y: 45 * GRID_SIZE },
				handles: {},
				isPoweredInitially: false,
			};
			const newPosition: XYPair = { x: 8 * GRID_SIZE, y: 44 * GRID_SIZE };
			const cmd = new MoveComponentCommand(newPosition, 3);

			cmd.execute(graphData);
			expect(graphData.components[3].position).toEqual(newPosition);

			cmd.undo(graphData);
			expect(graphData.components[3].position).toEqual({
				x: GRID_SIZE,
				y: 45 * GRID_SIZE,
			});
		});
	});

	describe("CreateWireCommand", () => {
		it("should create and remove wire", () => {
			const newWire = {
				input: { x: 5 * GRID_SIZE, y: 7 * GRID_SIZE, connections: [] },
				output: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
			};
			const cmd = new CreateWireCommand(newWire);

			const id = cmd.execute(graphData);
			expect(graphData.wires[id]).toBeDefined();
			expect(graphData.nextId).toBe(1);

			cmd.undo(graphData);
			expect(graphData.wires[id]).toBeUndefined();
			expect(graphData.nextId).toBe(0);
		});
	});

	describe("CreateComponentCommand", () => {
		// TODO: rework
		it("should create and remove component", () => {
			const newComponent: Omit<ComponentData, "id"> = {
				type: "AND",
				size: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				position: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				handles: {},
				isPoweredInitially: false,
			};
			const cmd = new CreateComponentCommand(newComponent);

			const id = cmd.execute(graphData);
			expect(graphData.components[id]).toBeDefined();
			expect(graphData.nextId).toBe(1);

			cmd.undo(graphData);
			expect(graphData.components[id]).toBeUndefined();
			expect(graphData.nextId).toBe(0);
		});
	});
	describe("Delete Commands", () => {
		it("should handle deleting component with multiple connections", () => {
			const componentId = 1;
			const wire1Id = 2;
			const wire2Id = 3;
			const wire3Id = 4;
			const wire4Id = 5;

			// Setup initial state
			graphData.components[componentId] = createMockComponent(componentId);
			graphData.wires[wire1Id] = createMockWire(wire1Id);
			graphData.wires[wire2Id] = createMockWire(wire2Id);
			graphData.wires[wire3Id] = createMockWire(wire3Id);
			graphData.wires[wire4Id] = createMockWire(wire4Id);

			// Connect wires to component inputs and outputs
			const fromComponent: ComponentConnection = {
				id: componentId,
				handleId: "out",
			};
			const fromWire1: WireConnection = {
				id: wire1Id,
				handleType: "output",
			};
			const fromWire2: WireConnection = {
				id: wire2Id,
				handleType: "output",
			};
			const toWire3: WireConnection = { id: wire3Id, handleType: "input" };
			const toWire4: WireConnection = { id: wire4Id, handleType: "input" };
			const toComponentIn1: ComponentConnection = {
				id: componentId,
				handleId: "in1",
			};
			const toComponentIn2: ComponentConnection = {
				id: componentId,
				handleId: "in2",
			};

			// Execute all connections
			new ConnectCommand(fromWire1, toComponentIn1).execute(graphData);
			new ConnectCommand(fromWire2, toComponentIn2).execute(graphData);
			new ConnectCommand(fromComponent, toWire3).execute(graphData);
			new ConnectCommand(fromComponent, toWire4).execute(graphData);

			// Delete component
			const deleteComponent = new DeleteComponentCommand(componentId);
			deleteComponent.execute(graphData);

			// Verify all connections are removed
			expect(graphData.components[componentId]).toBeUndefined();
			expect(graphData.wires[wire3Id].input.connections).toHaveLength(0);
			expect(graphData.wires[wire4Id].input.connections).toHaveLength(0);

			// Undo component deletion
			deleteComponent.undo(graphData);

			// Verify all connections are restored
			expect(graphData.components[componentId]).toBeDefined();
			expect(
				graphData.components[componentId].handles["in1"].connections,
			).toEqual([fromWire1]);
			expect(
				graphData.components[componentId].handles["in2"].connections,
			).toEqual([fromWire2]);
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([toWire3, toWire4]);
			expect(graphData.wires[wire3Id].input.connections).toEqual([
				fromComponent,
			]);
			expect(graphData.wires[wire4Id].input.connections).toEqual([
				fromComponent,
			]);
		});
		it("should only remove specific wire connection when deleting wire from multi-connected component output", () => {
			const componentId = 1;
			const wire1Id = 2;
			const wire2Id = 3;

			// Setup initial state
			graphData.components[componentId] = createMockComponent(componentId);
			graphData.wires[wire1Id] = createMockWire(wire1Id);
			graphData.wires[wire2Id] = createMockWire(wire2Id);

			// Connect both wires to component output
			const fromComponent: ComponentConnection = {
				id: componentId,
				handleId: "out",
			};
			const toWire1: WireConnection = { id: wire1Id, handleType: "input" };
			const toWire2: WireConnection = { id: wire2Id, handleType: "input" };

			new ConnectCommand(fromComponent, toWire1).execute(graphData);
			new ConnectCommand(fromComponent, toWire2).execute(graphData);

			// Verify initial connections
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([toWire1, toWire2]);

			// Delete wire1
			const deleteWire = new DeleteWireCommand(wire1Id);
			deleteWire.execute(graphData);

			// Verify wire1 is deleted
			expect(graphData.wires[wire1Id]).toBeUndefined();

			// Verify only wire1's connection is removed from component
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([toWire2]);

			// Undo deletion
			deleteWire.undo(graphData);

			// Verify wire1 and its connection are restored
			expect(graphData.wires[wire1Id]).toBeDefined();
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([toWire1, toWire2]);
			expect(graphData.wires[wire1Id].input.connections).toEqual([
				fromComponent,
			]);
		});
		it("should only remove specific wire connection when deleting wire from multi-connected wire output", () => {
			const sourceWireId = 1;
			const targetWire1Id = 2;
			const targetWire2Id = 3;

			// Setup initial state
			graphData.wires[sourceWireId] = createMockWire(sourceWireId);
			graphData.wires[targetWire1Id] = createMockWire(targetWire1Id);
			graphData.wires[targetWire2Id] = createMockWire(targetWire2Id);

			// Connect both target wires to source wire output
			const fromSourceWire: WireConnection = {
				id: sourceWireId,
				handleType: "output",
			};
			const toTargetWire1: WireConnection = {
				id: targetWire1Id,
				handleType: "input",
			};
			const toTargetWire2: WireConnection = {
				id: targetWire2Id,
				handleType: "input",
			};

			new ConnectCommand(fromSourceWire, toTargetWire1).execute(graphData);
			new ConnectCommand(fromSourceWire, toTargetWire2).execute(graphData);

			// Verify initial connections
			expect(graphData.wires[sourceWireId].output.connections).toEqual([
				toTargetWire1,
				toTargetWire2,
			]);

			// Delete targetWire1
			const deleteWire = new DeleteWireCommand(targetWire1Id);
			deleteWire.execute(graphData);

			// Verify targetWire1 is deleted
			expect(graphData.wires[targetWire1Id]).toBeUndefined();

			// Verify only targetWire1's connection is removed from source wire
			expect(graphData.wires[sourceWireId].output.connections).toEqual([
				toTargetWire2,
			]);

			// Undo deletion
			deleteWire.undo(graphData);

			// Verify targetWire1 and its connection are restored
			expect(graphData.wires[targetWire1Id]).toBeDefined();
			expect(graphData.wires[sourceWireId].output.connections).toEqual([
				toTargetWire1,
				toTargetWire2,
			]);
			expect(graphData.wires[targetWire1Id].input.connections).toEqual([
				fromSourceWire,
			]);
		});
	});
});

function createMockComponent(id: number): ComponentData {
	return {
		id,
		type: "AND",
		size: { x: 10, y: 10 },
		position: { x: GRID_SIZE, y: GRID_SIZE },
		handles: {
			in1: { edge: "left", pos: 1, type: "input", connections: [] },
			in2: { edge: "left", pos: 2, type: "input", connections: [] },
			out: { edge: "left", pos: 3, type: "output", connections: [] },
		},
		isPoweredInitially: false,
	};
}

function createMockWire(id: number): WireData {
	return {
		id,
		input: { x: 2 * GRID_SIZE, y: GRID_SIZE, connections: [] },
		output: { x: 0, y: GRID_SIZE, connections: [] },
	};
}

import { beforeEach, describe, expect, it } from "vitest";
import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	DeleteComponentCommand,
	DeleteWireCommand,
	DisconnectCommand,
	MoveComponentCommand,
	MoveWireHandleCommand,
	RotateComponentCommand,
	UpdateCustomDataCommand,
} from "./commands";
import { GRID_SIZE } from "./global.svelte";
import {
	newWireHandleRef,
	type ComponentData,
	type ComponentHandleReference,
	type GraphData,
	type ValidComponentInitData,
	type ValidWireInitData,
	type WireData,
	type WireHandleReference,
	type XYPair,
} from "./types";

describe("Command Tests", () => {
	let graphData: GraphData;
	/** Creates a new component handle reference.
	 * Shortcut that extracts relevant information for the ref from the graphData */
	const newCHR = function (
		cmpId: number,
		handleId: string,
	): ComponentHandleReference {
		return {
			id: cmpId,
			handleId,
			handleType: graphData.components[cmpId].handles[handleId].type,
			type: "component",
		};
	};
	const newWHR = newWireHandleRef;

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
				rotation: 0,
			});
			const cmd2 = new CreateComponentCommand({
				type: "AND",
				size: { x: 10, y: 10 },
				position: { x: 20 * GRID_SIZE, y: 11 * GRID_SIZE },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
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
				rotation: 0,
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
				rotation: 0,
			};

			const from: ComponentHandleReference = newCHR(fromId, "out");
			const to: ComponentHandleReference = newCHR(toId, "in");
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
				rotation: 0,
			};
			graphData.wires[toId] = {
				id: toId,
				handles: {
					input: {
						x: 100 * GRID_SIZE,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
				},
			};

			const from: ComponentHandleReference = newCHR(fromId, "out");
			const to: WireHandleReference = newWHR(toId, "input");
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.components[fromId].handles["out"].connections).toEqual([
				to,
			]);
			expect(graphData.wires[toId].handles.input.connections).toEqual([from]);

			cmd.undo(graphData);
			expect(
				graphData.components[fromId].handles["out"].connections,
			).toHaveLength(0);
			expect(graphData.wires[toId].handles.input.connections).toHaveLength(0);
		});
		it("should connect and disconnect wires", () => {
			const fromId = 79;
			const toId = 4000;
			graphData.wires[fromId] = {
				id: fromId,
				handles: {
					input: {
						x: 100 * GRID_SIZE,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: 4 * GRID_SIZE, connections: [], type: "output" },
				},
			};
			graphData.wires[toId] = {
				id: toId,
				handles: {
					input: {
						x: 101 * GRID_SIZE,
						y: 3 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: {
						x: GRID_SIZE,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "output",
					},
				},
			};

			const from: WireHandleReference = newWHR(fromId, "output");
			const to: WireHandleReference = newWHR(toId, "input");
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.wires[fromId].handles.output.connections).toEqual([to]);
			expect(graphData.wires[toId].handles.input.connections).toEqual([from]);

			cmd.undo(graphData);
			expect(graphData.wires[fromId].handles.output.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[toId].handles.input.connections).toHaveLength(0);
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
				rotation: 0,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
				},
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: {
						x: 0,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "output",
					},
				},
			};

			const from: ComponentHandleReference = newCHR(componentId, "out");
			const to1: WireHandleReference = newWHR(wire1Id, "input");
			const to2: WireHandleReference = newWHR(wire2Id, "input");

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
				rotation: 0,
			};

			graphData.wires[wireId] = {
				id: wireId,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
				},
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
				rotation: 0,
			};

			const from: ComponentHandleReference = newCHR(componentId, "out");
			const toWire: WireHandleReference = newWHR(wireId, "input");
			const toComponent: ComponentHandleReference = newCHR(
				otherComponentId,
				"in",
			);

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
				rotation: 0,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				handles: {
					input: { x: 0, y: GRID_SIZE, connections: [], type: "input" },
					output: { x: 0, y: 2 * GRID_SIZE, connections: [], type: "output" },
				},
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				handles: {
					input: { x: 0, y: 3 * GRID_SIZE, connections: [], type: "input" },
					output: { x: 0, y: 4 * GRID_SIZE, connections: [], type: "output" },
				},
			};

			const to: ComponentHandleReference = newCHR(componentId, "in");
			const from1: WireHandleReference = newWHR(wire1Id, "output");
			const from2: WireHandleReference = newWHR(wire2Id, "output");

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
				rotation: 0,
			};

			graphData.wires[wire1Id] = {
				id: wire1Id,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
				},
			};

			graphData.wires[wire2Id] = {
				id: wire2Id,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: {
						x: 0,
						y: 2 * GRID_SIZE,
						connections: [],
						type: "output",
					},
				},
			};

			const from: ComponentHandleReference = newCHR(componentId, "out");
			const to1: WireHandleReference = newWHR(wire1Id, "input");
			const to2: WireHandleReference = newWHR(wire2Id, "input");

			const cmd1 = new ConnectCommand(from, to1);
			const cmd2 = new ConnectCommand(from, to2);

			cmd1.execute(graphData);
			cmd2.execute(graphData);

			// Verify both connections are present
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([to1, to2]);
			expect(graphData.wires[wire1Id].handles.input.connections).toEqual([
				from,
			]);
			expect(graphData.wires[wire2Id].handles.input.connections).toEqual([
				from,
			]);

			// Undo second connection
			cmd2.undo(graphData);
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toEqual([to1]);
			expect(graphData.wires[wire1Id].handles.input.connections).toEqual([
				from,
			]);
			expect(graphData.wires[wire2Id].handles.input.connections).toHaveLength(
				0,
			);

			// Undo first connection
			cmd1.undo(graphData);
			expect(
				graphData.components[componentId].handles["out"].connections,
			).toHaveLength(0);
			expect(graphData.wires[wire1Id].handles.input.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire2Id].handles.input.connections).toHaveLength(
				0,
			);
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
				rotation: 0,
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
				rotation: 0,
			};

			// Set up wire
			graphData.wires[wire1Id] = {
				id: wire1Id,
				handles: {
					input: {
						x: 2 * GRID_SIZE,
						y: GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
				},
			};

			// Create connections
			const from1: ComponentHandleReference = newCHR(component1Id, "out");
			const from2: ComponentHandleReference = newCHR(component2Id, "out");
			const to: WireHandleReference = newWHR(wire1Id, "input");

			// Connect first component to wire
			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			// Try to connect second component to the same wire - should throw
			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[wire1Id].handles.input.connections).toEqual([
				from1,
			]);
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
				rotation: 0,
			};

			// Set up first wire
			graphData.wires[wire1Id] = {
				id: wire1Id,
				handles: {
					input: { x: 0, y: GRID_SIZE, connections: [], type: "input" },
					output: { x: 0, y: 2 * GRID_SIZE, connections: [], type: "output" },
				},
			};

			// Create connections
			const to: ComponentHandleReference = newCHR(componentId, "in");
			const from1: WireHandleReference = newWHR(wire1Id, "output");
			const from2: WireHandleReference = newWHR(wire1Id, "output");

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

			const from: WireHandleReference = newWHR(wireId, "output");
			const to1: ComponentHandleReference = newCHR(component1Id, "in1");
			const to2: ComponentHandleReference = newCHR(component2Id, "in1");

			const cmd1 = new ConnectCommand(from, to1);
			cmd1.execute(graphData);

			// Try to connect second component to the same wire output - should throw
			const cmd2 = new ConnectCommand(from, to2);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[wireId].handles.output.connections).toEqual([to1]);
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

			const from: WireHandleReference = newWHR(sourceWireId, "output");
			const toWire: WireHandleReference = newWHR(targetWireId, "input");
			const toComponent: ComponentHandleReference = newCHR(componentId, "in1");

			const cmd1 = new ConnectCommand(from, toWire);
			cmd1.execute(graphData);

			// Try to connect component to wire output that already has a wire connection
			const cmd2 = new ConnectCommand(from, toComponent);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only the first connection remains
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				toWire,
			]);
			expect(graphData.wires[targetWireId].handles.input.connections).toEqual([
				from,
			]);
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

			const from: WireHandleReference = newWHR(sourceWireId, "output");
			const to1: WireHandleReference = newWHR(targetWire1Id, "input");
			const to2: WireHandleReference = newWHR(targetWire2Id, "input");

			const cmd1 = new ConnectCommand(from, to1);
			const cmd2 = new ConnectCommand(from, to2);

			cmd1.execute(graphData);
			cmd2.execute(graphData);

			// Verify both connections are present
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				to1,
				to2,
			]);
			expect(graphData.wires[targetWire1Id].handles.input.connections).toEqual([
				from,
			]);
			expect(graphData.wires[targetWire2Id].handles.input.connections).toEqual([
				from,
			]);

			// Test undo operations
			cmd2.undo(graphData);
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				to1,
			]);
			expect(graphData.wires[targetWire1Id].handles.input.connections).toEqual([
				from,
			]);
			expect(
				graphData.wires[targetWire2Id].handles.input.connections,
			).toHaveLength(0);

			cmd1.undo(graphData);
			expect(
				graphData.wires[sourceWireId].handles.output.connections,
			).toHaveLength(0);
			expect(
				graphData.wires[targetWire1Id].handles.input.connections,
			).toHaveLength(0);
			expect(
				graphData.wires[targetWire2Id].handles.input.connections,
			).toHaveLength(0);
		});
		it("should error when connecting two wire inputs or outputs", () => {
			const wire1Id = 1;
			const wire2Id = 2;

			graphData.wires[wire1Id] = createMockWire(wire1Id);
			graphData.wires[wire2Id] = createMockWire(wire2Id);

			// Try to connect input to input
			const input1: WireHandleReference = newWHR(wire1Id, "input");
			const input2: WireHandleReference = newWHR(wire2Id, "input");
			const cmd1 = new ConnectCommand(input1, input2);
			expect(() => cmd1.execute(graphData)).toThrow();

			// Try to connect output to output
			const output1: WireHandleReference = newWHR(wire1Id, "output");
			const output2: WireHandleReference = newWHR(wire2Id, "output");
			const cmd2 = new ConnectCommand(output1, output2);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify no connections were made
			expect(graphData.wires[wire1Id].handles.input.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire1Id].handles.output.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire2Id].handles.input.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire2Id].handles.output.connections).toHaveLength(
				0,
			);
		});

		it("should error when connecting multiple wires to wire input", () => {
			const targetWireId = 1;
			const sourceWire1Id = 2;
			const sourceWire2Id = 3;

			graphData.wires[targetWireId] = createMockWire(targetWireId);
			graphData.wires[sourceWire1Id] = createMockWire(sourceWire1Id);
			graphData.wires[sourceWire2Id] = createMockWire(sourceWire2Id);

			const to: WireHandleReference = newWHR(targetWireId, "input");
			const from1: WireHandleReference = newWHR(sourceWire1Id, "output");
			const from2: WireHandleReference = newWHR(sourceWire2Id, "output");

			// Connect first wire
			const cmd1 = new ConnectCommand(from1, to);
			cmd1.execute(graphData);

			// Try to connect second wire to same input - should throw
			const cmd2 = new ConnectCommand(from2, to);
			expect(() => cmd2.execute(graphData)).toThrow();

			// Verify only first connection remains
			expect(graphData.wires[targetWireId].handles.input.connections).toEqual([
				from1,
			]);
			expect(graphData.wires[sourceWire1Id].handles.output.connections).toEqual(
				[to],
			);
			expect(
				graphData.wires[sourceWire2Id].handles.output.connections,
			).toHaveLength(0);
		});
	});
	describe("DisconnectCommand", () => {
		it("should disconnect a wire from a component", () => {
			const componentId = 1;
			const wireId = 2;

			graphData.components[componentId] = createMockComponent(componentId);
			graphData.wires[wireId] = createMockWire(wireId);

			const from: ComponentHandleReference = newCHR(componentId, "out");
			const to: WireHandleReference = newWHR(wireId, "input");

			const cmd = new ConnectCommand(from, to);
			cmd.execute(graphData);

			const disconnectCmd = new DisconnectCommand(from, to);
			disconnectCmd.execute(graphData);

			expect(
				graphData.components[componentId].handles["out"].connections,
			).toHaveLength(0);
			expect(graphData.wires[wireId].handles.input.connections).toHaveLength(0);
		});
		it("should disconnect two wires from each other", () => {
			const wire1Id = 1;
			const wire2Id = 2;

			graphData.wires[wire1Id] = createMockWire(wire1Id);
			graphData.wires[wire2Id] = createMockWire(wire2Id);

			const from: WireHandleReference = newWHR(wire1Id, "output");
			const to: WireHandleReference = newWHR(wire2Id, "input");

			const cmd = new ConnectCommand(from, to);
			cmd.execute(graphData);

			const disconnectCmd = new DisconnectCommand(from, to);
			disconnectCmd.execute(graphData);

			expect(graphData.wires[wire1Id].handles.output.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire2Id].handles.input.connections).toHaveLength(
				0,
			);
		});
	});

	describe("MoveWireConnectionCommand", () => {
		it("should move wire connection", () => {
			const id = 32;
			graphData.wires[id] = {
				id: id,
				handles: {
					input: {
						x: GRID_SIZE,
						y: 2000 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: {
						x: 0,
						y: 30 * GRID_SIZE,
						connections: [],
						type: "output",
					},
				},
			};
			const newPosition: XYPair = { x: 1000 * GRID_SIZE, y: 999 * GRID_SIZE };
			const cmd = new MoveWireHandleCommand(newPosition, "input", id);

			cmd.execute(graphData);
			expect(graphData.wires[id].handles.input.x).toBe(1000 * GRID_SIZE);
			expect(graphData.wires[id].handles.input.y).toBe(999 * GRID_SIZE);

			expect(graphData.wires[id].handles.output.x).toBe(0);
			expect(graphData.wires[id].handles.output.y).toBe(30 * GRID_SIZE);

			cmd.undo(graphData);
			expect(graphData.wires[id].handles.input.x).toBe(GRID_SIZE);
			expect(graphData.wires[id].handles.input.y).toBe(2000 * GRID_SIZE);

			expect(graphData.wires[id].handles.output.x).toBe(0);
			expect(graphData.wires[id].handles.output.y).toBe(30 * GRID_SIZE);
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
				rotation: 0,
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
			const newWire: ValidWireInitData = {
				handles: {
					input: {
						x: 5 * GRID_SIZE,
						y: 7 * GRID_SIZE,
						connections: [],
						type: "input",
					},
					output: {
						x: 2 * GRID_SIZE,
						y: GRID_SIZE,
						connections: [],
						type: "output",
					},
				},
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
		it("should create and remove component", () => {
			const newComponent: ValidComponentInitData = {
				type: "AND",
				size: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				position: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
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
			const componentOut: ComponentHandleReference = newCHR(componentId, "out");
			const fromWire1: WireHandleReference = newWHR(wire1Id, "output");
			const fromWire2: WireHandleReference = newWHR(wire2Id, "output");
			const toWire3: WireHandleReference = newWHR(wire3Id, "input");
			const toWire4: WireHandleReference = newWHR(wire4Id, "input");
			const toComponentIn1: ComponentHandleReference = newCHR(
				componentId,
				"in1",
			);
			const toComponentIn2: ComponentHandleReference = newCHR(
				componentId,
				"in2",
			);

			// Execute all connections
			new ConnectCommand(fromWire1, toComponentIn1).execute(graphData);
			new ConnectCommand(fromWire2, toComponentIn2).execute(graphData);
			new ConnectCommand(componentOut, toWire3).execute(graphData);
			new ConnectCommand(componentOut, toWire4).execute(graphData);

			// Delete component
			const deleteComponent = new DeleteComponentCommand(componentId);
			deleteComponent.execute(graphData);

			// Verify all connections are removed
			expect(graphData.components[componentId]).toBeUndefined();

			expect(graphData.wires[wire1Id].handles.output.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire2Id].handles.output.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire3Id].handles.input.connections).toHaveLength(
				0,
			);
			expect(graphData.wires[wire4Id].handles.input.connections).toHaveLength(
				0,
			);

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
			expect(graphData.wires[wire3Id].handles.input.connections).toEqual([
				componentOut,
			]);
			expect(graphData.wires[wire4Id].handles.input.connections).toEqual([
				componentOut,
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
			const fromComponent: ComponentHandleReference = newCHR(
				componentId,
				"out",
			);
			const toWire1: WireHandleReference = newWHR(wire1Id, "input");
			const toWire2: WireHandleReference = newWHR(wire2Id, "input");

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
			expect(graphData.wires[wire1Id].handles.input.connections).toEqual([
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
			const fromSourceWire: WireHandleReference = newWHR(
				sourceWireId,
				"output",
			);
			const toTargetWire1: WireHandleReference = newWHR(targetWire1Id, "input");
			const toTargetWire2: WireHandleReference = newWHR(targetWire2Id, "input");

			new ConnectCommand(fromSourceWire, toTargetWire1).execute(graphData);
			new ConnectCommand(fromSourceWire, toTargetWire2).execute(graphData);

			// Verify initial connections
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				toTargetWire1,
				toTargetWire2,
			]);

			// Delete targetWire1
			const deleteWire = new DeleteWireCommand(targetWire1Id);
			deleteWire.execute(graphData);

			// Verify targetWire1 is deleted
			expect(graphData.wires[targetWire1Id]).toBeUndefined();

			// Verify only targetWire1's connection is removed from source wire
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				toTargetWire2,
			]);

			// Undo deletion
			deleteWire.undo(graphData);

			// Verify targetWire1 and its connection are restored
			expect(graphData.wires[targetWire1Id]).toBeDefined();
			expect(graphData.wires[sourceWireId].handles.output.connections).toEqual([
				toTargetWire1,
				toTargetWire2,
			]);
			expect(graphData.wires[targetWire1Id].handles.input.connections).toEqual([
				fromSourceWire,
			]);
		});
	});
	describe("Rotate Command", () => {
		it("should rotate a component", () => {
			graphData.components[1] = createMockComponent(1);
			new RotateComponentCommand(1, 123).execute(graphData);
			expect(graphData.components[1].rotation).toBe(123);

			new RotateComponentCommand(1, 0).execute(graphData);
			expect(graphData.components[1].rotation).toBe(123);

			new RotateComponentCommand(1, 90).execute(graphData);
			expect(graphData.components[1].rotation).toBe(213);

			new RotateComponentCommand(1, 180).execute(graphData);
			expect(graphData.components[1].rotation).toBe(33);

			new RotateComponentCommand(1, -33).execute(graphData);
			expect(graphData.components[1].rotation).toBe(0);

			const c1 = new RotateComponentCommand(1, -90);
			c1.execute(graphData);
			expect(graphData.components[1].rotation).toBe(270);

			const c2 = new RotateComponentCommand(1, 90);
			c2.execute(graphData);
			expect(graphData.components[1].rotation).toBe(0);

			c2.undo(graphData);
			expect(graphData.components[1].rotation).toBe(270);

			c1.undo(graphData);
			expect(graphData.components[1].rotation).toBe(0);
		});
	});
	
	describe("UpdateCustomDataCommand", () => {
		it("should update custom data property and undo correctly", () => {
			// Create a TEXT component with initial custom data
			const componentId = 1;
			graphData.components[componentId] = {
				id: componentId,
				type: "TEXT",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
				customData: {
					text: "Initial Text",
					fontSize: 16,
				},
			};

			const cmd = new UpdateCustomDataCommand(componentId, "text", "Updated Text");
			
			// Execute command
			cmd.execute(graphData);
			expect(graphData.components[componentId].customData?.text).toBe("Updated Text");
			expect(graphData.components[componentId].customData?.fontSize).toBe(16); // Should remain unchanged

			// Undo command
			cmd.undo(graphData);
			expect(graphData.components[componentId].customData?.text).toBe("Initial Text");
			expect(graphData.components[componentId].customData?.fontSize).toBe(16);
		});

		it("should handle component with no initial custom data", () => {
			const componentId = 2;
			graphData.components[componentId] = {
				id: componentId,
				type: "TEXT",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
				// No customData field
			};

			const cmd = new UpdateCustomDataCommand(componentId, "text", "New Text");
			
			// Execute command
			cmd.execute(graphData);
			expect(graphData.components[componentId].customData?.text).toBe("New Text");

			// Undo command - should remove the property since it didn't exist before
			cmd.undo(graphData);
			expect(graphData.components[componentId].customData?.text).toBeUndefined();
		});

		it("should handle updating property that didn't exist before", () => {
			const componentId = 3;
			graphData.components[componentId] = {
				id: componentId,
				type: "TEXT",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
				customData: {
					text: "Existing Text",
				},
			};

			const cmd = new UpdateCustomDataCommand(componentId, "fontSize", 24);
			
			// Execute command
			cmd.execute(graphData);
			expect(graphData.components[componentId].customData?.fontSize).toBe(24);
			expect(graphData.components[componentId].customData?.text).toBe("Existing Text");

			// Undo command - should remove the new property
			cmd.undo(graphData);
			expect(graphData.components[componentId].customData?.fontSize).toBeUndefined();
			expect(graphData.components[componentId].customData?.text).toBe("Existing Text");
		});

		it("should throw error when component doesn't exist", () => {
			const cmd = new UpdateCustomDataCommand(999, "text", "Some Text");
			
			expect(() => cmd.execute(graphData)).toThrow("Component with id 999 does not exist");
		});

		it("should handle various data types", () => {
			const componentId = 4;
			graphData.components[componentId] = {
				id: componentId,
				type: "TEXT",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
				isPoweredInitially: false,
				rotation: 0,
				customData: {},
			};

			// Test with number
			const cmd1 = new UpdateCustomDataCommand(componentId, "number", 42);
			cmd1.execute(graphData);
			expect(graphData.components[componentId].customData?.number).toBe(42);

			// Test with boolean
			const cmd2 = new UpdateCustomDataCommand(componentId, "boolean", true);
			cmd2.execute(graphData);
			expect(graphData.components[componentId].customData?.boolean).toBe(true);

			// Test with object
			const testObj = { nested: "value" };
			const cmd3 = new UpdateCustomDataCommand(componentId, "object", testObj);
			cmd3.execute(graphData);
			expect(graphData.components[componentId].customData?.object).toEqual(testObj);

			// Undo in reverse order
			cmd3.undo(graphData);
			expect(graphData.components[componentId].customData?.object).toBeUndefined();
			
			cmd2.undo(graphData);
			expect(graphData.components[componentId].customData?.boolean).toBeUndefined();
			
			cmd1.undo(graphData);
			expect(graphData.components[componentId].customData?.number).toBeUndefined();
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
		rotation: 0,
	};
}

function createMockWire(id: number): WireData {
	return {
		id,
		handles: {
			input: {
				x: 2 * GRID_SIZE,
				y: GRID_SIZE,
				connections: [],
				type: "input",
			},
			output: { x: 0, y: GRID_SIZE, connections: [], type: "output" },
		},
	};
}

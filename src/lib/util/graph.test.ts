import { describe, it, expect, beforeEach } from "vitest";
import {
	CommandGroup,
	ConnectCommand,
	MoveWireConnectionCommand,
	MoveComponentCommand,
	CreateWireCommand,
	CreateComponentCommand,
} from "./graph";
import type {
	GraphData,
	XYPair,
	ComponentConnection,
	WireConnection,
} from "./types";
import { GRID_SIZE } from "./global";

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
				type: "test",
				label: "test",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {},
			});
			const cmd2 = new CreateComponentCommand({
				type: "test2",
				label: "test2",
				size: { x: 10, y: 10 },
				position: { x: 20 * GRID_SIZE, y: 11 * GRID_SIZE },
				handles: {},
			});
			const group = new CommandGroup([cmd1, cmd2]);

			group.execute(graphData);
			expect(Object.keys(graphData.components).length).toBe(2);

			group.undo(graphData);
			expect(Object.keys(graphData.components).length).toBe(0);
		});
	});

	describe("ConnectCommand", () => {
		it("should connect and disconnect components", () => {
			const fromId = 1;
			const toId = 30;
			graphData.components[toId] = {
				id: toId,
				type: "test",
				label: "test",
				size: { x: 10, y: 10 },
				position: { x: 2 * GRID_SIZE, y: 3 * GRID_SIZE },
				handles: {
					in: { edge: "left", pos: 3, type: "input", connection: null },
				},
			};
			graphData.components[fromId] = {
				id: fromId,
				type: "test",
				label: "test",
				size: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				handles: {
					out: { edge: "bottom", pos: 100, type: "output", connection: null },
				},
			};

			const from: ComponentConnection = { id: fromId, handleId: "out" };
			const to: ComponentConnection = { id: toId, handleId: "in" };
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.components[fromId].handles["out"].connection).toEqual(
				to,
			);
			expect(graphData.components[toId].handles["in"].connection).toEqual(from);

			cmd.undo(graphData);
			expect(graphData.components[fromId].handles["out"].connection).toBeNull();
			expect(graphData.components[toId].handles["in"].connection).toBeNull();
		});
		it("should connect and disconnect wire and component", () => {
			const fromId = 100;
			const toId = 1;
			graphData.components[fromId] = {
				id: fromId,
				type: "test",
				label: "test",
				size: { x: 10, y: 10 },
				position: { x: GRID_SIZE, y: GRID_SIZE },
				handles: {
					out: { edge: "left", pos: 3, type: "output", connection: null },
				},
			};
			graphData.wires[toId] = {
				id: toId,
				label: "test",
				input: { x: 100 * GRID_SIZE, y: 2 * GRID_SIZE, connection: null },
				output: { x: 0, y: GRID_SIZE, connection: null },
			};

			const from: ComponentConnection = { id: fromId, handleId: "out" };
			const to: WireConnection = { id: toId, handleType: "input" };
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.components[fromId].handles["out"].connection).toEqual(
				to,
			);
			expect(graphData.wires[toId].input.connection).toEqual(from);

			cmd.undo(graphData);
			expect(graphData.components[fromId].handles["out"].connection).toBeNull();
			expect(graphData.wires[toId].input.connection).toBeNull();
		});
		it("should connect and disconnect wires", () => {
			const fromId = 79;
			const toId = 4000;
			graphData.wires[fromId] = {
				id: fromId,
				label: "test",
				input: { x: 100 * GRID_SIZE, y: 2 * GRID_SIZE, connection: null },
				output: { x: 0, y: 4 * GRID_SIZE, connection: null },
			};
			graphData.wires[toId] = {
				id: toId,
				label: "test2",
				input: { x: 101 * GRID_SIZE, y: 3 * GRID_SIZE, connection: null },
				output: { x: GRID_SIZE, y: 2 * GRID_SIZE, connection: null },
			};

			const from: WireConnection = { id: fromId, handleType: "output" };
			const to: WireConnection = { id: toId, handleType: "input" };
			const cmd = new ConnectCommand(from, to);

			cmd.execute(graphData);
			expect(graphData.wires[fromId].output.connection).toEqual(to);
			expect(graphData.wires[toId].input.connection).toEqual(from);

			cmd.undo(graphData);
			expect(graphData.wires[fromId].output.connection).toBeNull();
			expect(graphData.wires[toId].input.connection).toBeNull();
		});
	});

	describe("MoveWireConnectionCommand", () => {
		it("should move wire connection", () => {
			const id = 32;
			graphData.wires[id] = {
				id: id,
				label: "test",
				input: { x: GRID_SIZE, y: 2000 * GRID_SIZE, connection: null },
				output: { x: 0, y: 30 * GRID_SIZE, connection: null },
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
				type: "test",
				label: "test",
				size: { x: 4, y: 1000 },
				position: { x: GRID_SIZE, y: 45 * GRID_SIZE },
				handles: {},
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
				label: "testlabel",
				input: { x: 5 * GRID_SIZE, y: 7 * GRID_SIZE, connection: null },
				output: { x: 2 * GRID_SIZE, y: GRID_SIZE, connection: null },
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
			const newComponent = {
				type: "test",
				label: "component",
				size: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				position: { x: 30 * GRID_SIZE, y: GRID_SIZE },
				handles: {},
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
});

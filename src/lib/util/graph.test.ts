import { describe, it, expect, beforeEach, vi } from "vitest";
import { _Graph, _GraphManager, graph } from "./graph";
import type { GraphData } from "./types";
import { GRID_SIZE } from "./global";
import { get } from "svelte/store";

import * as CommandModule from "./commands";

// Mock the Command class and its methods
class MockCommand {
	execute = vi.fn();
	undo = vi.fn();
}

describe("Graph", () => {
	let testGraph: _Graph;

	beforeEach(() => {
		testGraph = new _Graph();
	});

	it("should initialize with empty data and history", () => {
		expect(get(testGraph.data)).toEqual({
			components: {},
			wires: {},
			nextId: 0,
		});
		expect(get(testGraph.history)).toEqual([]);
	});

	it("should execute a command and update data and history", () => {
		const mockCommand = new MockCommand();
		testGraph.executeCommand(mockCommand);

		expect(mockCommand.execute).toHaveBeenCalled();
		expect(get(testGraph.history)).toHaveLength(1);
	});

	it("should undo the last command", () => {
		const mockCommand = new MockCommand();
		testGraph.executeCommand(mockCommand);
		testGraph.undoLastCommand();

		expect(mockCommand.undo).toHaveBeenCalled();
		expect(get(testGraph.history)).toHaveLength(0);
	});

	it("should load graph data", () => {
		const graphData: GraphData = {
			components: {
				0: {
					id: 0,
					handles: {},
					label: "test",
					position: { x: 0, y: 0 },
					size: { x: 0, y: 0 },
					type: "test",
				},
			},
			wires: {},
			nextId: 1,
		};
		testGraph.loadGraph(graphData);

		expect(get(testGraph.data)).toEqual(graphData);
		expect(get(testGraph.history)).toEqual([]);
	});

	it("should get current graph data", () => {
		const graphData: GraphData = {
			components: {
				0: {
					id: 0,
					handles: {},
					label: "test",
					position: { x: 0, y: 0 },
					size: { x: 0, y: 0 },
					type: "test",
				},
			},
			wires: {},
			nextId: 1,
		};
		testGraph.loadGraph(graphData);

		expect(testGraph.getGraph()).toEqual(graphData);
	});
});

describe("GraphManager", () => {
	let testGraphManager: _GraphManager;

	beforeEach(() => {
		graph.history.set([]);
		graph.data.set({ components: {}, wires: {}, nextId: 0 });
		testGraphManager = new _GraphManager();
	});

	it("should execute a command", () => {
		const mockCommand = new MockCommand();
		testGraphManager.executeCommand(mockCommand);

		expect(mockCommand.execute).toHaveBeenCalled();
	});

	it("should replace the last command if replace is true", () => {
		const mockCommand1 = new MockCommand();
		const mockCommand2 = new MockCommand();

		testGraphManager.executeCommand(mockCommand1);
		testGraphManager.executeCommand(mockCommand2, true);

		expect(mockCommand1.undo).toHaveBeenCalled();
	});
	it("should not replace the last command if replace is true and commands not the same", () => {
		class OtherMockCommand {
			execute = vi.fn();
			undo = vi.fn();
		}

		const mockCommand1 = new OtherMockCommand();
		const mockCommand2 = new MockCommand();

		testGraphManager.executeCommand(mockCommand1);
		testGraphManager.executeCommand(mockCommand2, true);

		expect(mockCommand1.undo).toHaveBeenCalledTimes(0);
	});

	it("should cancel changes", () => {
		const mockSubscriber = vi.fn();
		testGraphManager.subscribe(mockSubscriber); // notifies
		const mockCommand = {
			execute: (data: GraphData) => {
				data.nextId++;
			},
			undo: () => {},
		};
		testGraphManager.executeCommand(mockCommand); // does not notify
		testGraphManager.cancelChanges(); // notifies

		expect((testGraphManager as any).currentData.nextId).toEqual(0);
		expect((testGraphManager as any).history).toEqual([]);
		expect(mockSubscriber).toHaveBeenCalledTimes(2);
	});

	it("should apply changes", () => {
		const mockCommand = new MockCommand();
		testGraphManager.executeCommand(mockCommand);
		testGraphManager.applyChanges();

		// Verify that the changes were applied to the global graph
		expect(get(graph.history)).toHaveLength(1);
	});

	it("should undo last command from global graph if local history is empty", () => {
		const undoSpy = vi.spyOn(graph, "undoLastCommand");
		testGraphManager.undo();

		expect(undoSpy).toHaveBeenCalled();
	});

	it("should not undo last command from global graph if local history is not empty", () => {
		const undoSpy = vi.spyOn(graph, "undoLastCommand");
		testGraphManager.executeCommand(new MockCommand());
		testGraphManager.undo();

		expect(undoSpy).toHaveBeenCalledTimes(0);
	});

	it("should move a component and update connected wires", () => {
		// TODO
	});

	it("should notify subscribers when data changes", () => {
		const mockSubscriber = vi.fn();
		testGraphManager.subscribe(mockSubscriber);

		// Simulate a data change
		graph.data.set({ components: {}, wires: {}, nextId: 1 });

		expect(mockSubscriber).toHaveBeenCalled();
	});

	it("should create and execute commands for moving a component and its connected wires", () => {
		((testGraphManager as any).currentData as GraphData) = {
			components: {
				0: {
					id: 0,
					label: "test",
					type: "test",
					position: { x: 50, y: 50 },
					size: { x: 4, y: 4 },
					handles: {
						out1: {
							edge: "top",
							type: "output",
							pos: 1,
							connection: { handleType: "input", id: 3 },
						},
						out2: {
							edge: "bottom",
							type: "output",
							pos: 1,
							connection: null,
						},
					},
				},
			},
			wires: {},
			nextId: 1,
		};
		// Set up mock classes
		const MoveComponentCommandMock = vi.fn();
		const MoveWireConnectionCommandMock = vi.fn();
		const CommandGroupMock = vi.fn();

		// Mock the required classes
		vi.spyOn(CommandModule, "MoveComponentCommand").mockImplementation(
			MoveComponentCommandMock,
		);
		vi.spyOn(CommandModule, "MoveWireConnectionCommand").mockImplementation(
			MoveWireConnectionCommandMock,
		);
		vi.spyOn(CommandModule, "CommandGroup").mockImplementation(
			CommandGroupMock,
		);
		// Mock the executeCommand method
		(testGraphManager as any).executeCommand = vi.fn();

		const newComponentPos = { x: 100, y: 200 };
		const componentId = 0;

		testGraphManager.moveComponentReplaceable(newComponentPos, componentId, {
			x: 4,
			y: 4,
		});

		// Component was moved
		expect(MoveComponentCommandMock).toHaveBeenCalledWith(
			newComponentPos,
			componentId,
		);
		// Wire was moved
		expect(MoveWireConnectionCommandMock).toHaveBeenCalledWith(
			{ x: 100 + GRID_SIZE, y: 200 }, // newComponentPos + handleOffset
			"input",
			3,
		);
		// Only one wire was moved
		expect(MoveWireConnectionCommandMock).toHaveBeenCalledTimes(1);
		// Commands were grouped
		expect(CommandGroupMock).toHaveBeenCalled();
		// Commands were executed
		expect((testGraphManager as any).executeCommand).toHaveBeenCalledWith(
			expect.any(CommandModule.CommandGroup),
			true,
		);
	});
});

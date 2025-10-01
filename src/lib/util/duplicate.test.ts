import { describe, it, expect, beforeEach } from "vitest";
import { DuplicateAction, graphManager, editorViewModel } from "./actions.svelte";
import { newWireHandleRef, type GraphData } from "./types";

function comp(id: number, overrides: Partial<any> = {}) {
	return {
		id,
		type: "AND" as const,
		size: { x: 1, y: 1 },
		position: { x: 10 * id, y: 0 },
		isPoweredInitially: false,
		rotation: 0,
		handles: {
			out: {
				edge: "right" as const,
				pos: 0,
				type: "output" as const,
				connections: [] as any[],
			},
			in1: {
				edge: "left" as const,
				pos: 0,
				type: "input" as const,
				connections: [] as any[],
			},
		},
		...overrides,
	};
}
function wire(id: number, overrides: Partial<any> = {}) {
	return {
		id,
		handles: {
			input: { x: 0, y: id * 10, type: "input" as const, connections: [] as any[] },
			output: { x: 20, y: id * 10, type: "output" as const, connections: [] as any[] },
		},
		...overrides,
	};
}

describe("DuplicateAction", () => {
	beforeEach(() => {
		graphManager.clear();
		editorViewModel.hardReset();
	});

	it("duplicates component + wire subset and prunes external connections", () => {
		// Original graph: component 0 connects to wire 1 and wire 2 (wire2 external)
		const c0 = comp(0);
		const w1 = wire(1);
		const w2 = wire(2);
		// Connect c0.out -> w1.input & w2.input
		c0.handles.out.connections.push(newWireHandleRef(1, "input"), newWireHandleRef(2, "input"));
		w1.handles.input.connections.push({ id: 0, handleId: "out", handleType: "output", type: "component" });
		w2.handles.input.connections.push({ id: 0, handleId: "out", handleType: "output", type: "component" });

		const data: GraphData = { components: { 0: c0 }, wires: { 1: w1, 2: w2 }, nextId: 3 };
		graphManager.setGraphData(data);

		// Select component 0 and wire 1 only
		editorViewModel.setSelectedElements([
			{ id: 0, type: "component" },
			{ id: 1, type: "wire" },
		]);

		DuplicateAction.duplicateSelected();

		const gd = graphManager.getGraphData();
		// New ids should be 3 (for id0) and 4 (for id1) in insertion order
		expect(gd.components[3]).toBeDefined();
		expect(gd.wires[4]).toBeDefined();
		expect(gd.nextId).toBe(5);

		// Internal connection preserved between duplicates
		const dupComp = gd.components[3];
		const dupWire = gd.wires[4];
		const compOutConns = dupComp.handles.out.connections;
		expect(compOutConns).toHaveLength(1);
		expect(compOutConns[0].id).toBe(4);
		const wireInputConns = dupWire.handles.input.connections;
		expect(wireInputConns).toHaveLength(1);
		expect(wireInputConns[0].id).toBe(3);

		// External connection to original wire 2 should be pruned
		const stillExternal = compOutConns.find((c: any) => c.id === 2);
		expect(stillExternal).toBeUndefined();
	});

	it("duplicates multiple wires and removes connections to outside wires", () => {
		// w3 output -> w4 input & w5 input; select w3 & w4 only
		const w3 = wire(3);
		const w4 = wire(4);
		const w5 = wire(5);
		w3.handles.output.connections.push(newWireHandleRef(4, "input"), newWireHandleRef(5, "input"));
		w4.handles.input.connections.push(newWireHandleRef(3, "output"));
		w5.handles.input.connections.push(newWireHandleRef(3, "output"));
		const data: GraphData = { components: {}, wires: { 3: w3, 4: w4, 5: w5 }, nextId: 6 };
		graphManager.setGraphData(data);
		editorViewModel.setSelectedElements([
			{ id: 3, type: "wire" },
			{ id: 4, type: "wire" },
		]);

		DuplicateAction.duplicateSelected();
		const gd = graphManager.getGraphData();
		// New ids: 6,7
		expect(gd.wires[6]).toBeDefined();
		expect(gd.wires[7]).toBeDefined();
		expect(gd.nextId).toBe(8);
		const dupW3 = gd.wires[6];
		const dupW4 = gd.wires[7];
		// Output connections of duplicated w3 should only include duplicated w4, not outside w5
		expect(dupW3.handles.output.connections).toHaveLength(1);
		expect(dupW3.handles.output.connections[0].id).toBe(7);
		// Duplicated w4 input should reference duplicated w3
		expect(dupW4.handles.input.connections).toHaveLength(1);
		expect(dupW4.handles.input.connections[0].id).toBe(6);
	});
});

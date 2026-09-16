import { describe, expect, it } from "vitest";
import {
	MAX_FONT_SIZE,
	MAX_GRAPH_ELEMENTS,
	MAX_LABEL_LENGTH,
	MAX_TEXT_LENGTH,
} from "./graphValidation";
import { ZGraphData, type GraphData } from "./types";

function graph(): GraphData {
	return {
		nextId: 2,
		components: {
			0: {
				id: 0,
				type: "IN",
				size: { x: 2, y: 2 },
				position: { x: 0, y: 0 },
				rotation: 0,
				isPoweredInitially: false,
				handles: {
					out: {
						edge: "right",
						pos: 1,
						type: "output",
						connections: [
							{ id: 1, type: "wire", handleId: "input", handleType: "input" },
						],
					},
				},
			},
		},
		wires: {
			1: {
				id: 1,
				handles: {
					input: {
						x: 2,
						y: 1,
						type: "input",
						connections: [
							{
								id: 0,
								type: "component",
								handleId: "out",
								handleType: "output",
							},
						],
					},
					output: { x: 4, y: 1, type: "output", connections: [] },
				},
			},
		},
	};
}

describe("graph format validation", () => {
	it("accepts a connected graph and an empty graph", () => {
		expect(ZGraphData.safeParse(graph()).success).toBe(true);
		expect(
			ZGraphData.safeParse({ components: {}, wires: {}, nextId: 0 }).success,
		).toBe(true);
	});
	it.each([
		[
			"ID/key mismatch",
			(g: GraphData) => {
				g.components[0].id = 5;
			},
		],
		[
			"fractional ID",
			(g: GraphData) => {
				g.nextId = 2.5;
			},
		],
		[
			"reused next ID",
			(g: GraphData) => {
				g.nextId = 1;
			},
		],
		[
			"negative size",
			(g: GraphData) => {
				g.components[0].size.x = -1;
			},
		],
		[
			"non-finite coordinate",
			(g: GraphData) => {
				g.wires[1].handles.input.x = Infinity;
			},
		],
		[
			"missing target",
			(g: GraphData) => {
				g.components[0].handles.out.connections[0].id = 999;
			},
		],
		[
			"missing reciprocal edge",
			(g: GraphData) => {
				g.wires[1].handles.input.connections = [];
			},
		],
		[
			"duplicate connection",
			(g: GraphData) => {
				const h = g.components[0].handles.out;
				h.connections.push(h.connections[0]);
			},
		],
		[
			"wrong reference type",
			(g: GraphData) => {
				g.wires[1].handles.input.connections[0].handleType = "input";
			},
		],
		[
			"wrong wire handle type",
			(g: GraphData) => {
				g.wires[1].handles.input.type = "output";
			},
		],
		[
			"missing component port",
			(g: GraphData) => {
				delete g.components[0].handles.out;
			},
		],
		[
			"out-of-bounds port",
			(g: GraphData) => {
				g.components[0].handles.out.pos = 3;
			},
		],
		[
			"unknown custom field",
			(g: GraphData) => {
				g.components[0].customData = { executable: {} };
			},
		],
		[
			"invalid label",
			(g: GraphData) => {
				g.components[0].customData = { label: 42 };
			},
		],
	])("rejects %s", (_name, mutate) => {
		const data = graph();
		mutate(data);
		expect(ZGraphData.safeParse(data).success).toBe(false);
	});
	it("rejects unsafe record keys and extra wire handles", () => {
		const data = graph();
		data.wires[1].handles.extra = data.wires[1].handles.output;
		expect(ZGraphData.safeParse(data).success).toBe(false);
		expect(
			ZGraphData.safeParse(
				JSON.parse('{"components":{"__proto__":{}},"wires":{},"nextId":0}'),
			).success,
		).toBe(false);
	});
	it("rejects IDs shared between components and wires", () => {
		const data = graph();
		data.wires[0] = { ...data.wires[1], id: 0 };
		delete data.wires[1];
		expect(ZGraphData.safeParse(data).success).toBe(false);
	});
	it.each([
		null,
		[],
		42,
		{ wires: {}, components: { bad: {} }, nextId: 0 },
		{ wires: {}, components: { 0: {} }, nextId: 1 },
	])("returns a validation error for malformed structures", (data) => {
		expect(ZGraphData.safeParse(data).success).toBe(false);
	});
	it("validates text data without requiring legacy optional fields", () => {
		const data = graph();
		data.wires = {};
		const component = data.components[0];
		component.type = "TEXT";
		component.handles = {};
		expect(ZGraphData.safeParse(data).success).toBe(true);
		component.customData = { text: "Hello", fontSize: 16, alignment: "left" };
		expect(ZGraphData.safeParse(data).success).toBe(true);
		for (const customData of [
			{ fontSize: 0 },
			{ fontSize: MAX_FONT_SIZE + 1 },
			{ alignment: "invalid" },
			{ text: "x".repeat(MAX_TEXT_LENGTH + 1) },
		]) {
			component.customData = customData;
			expect(ZGraphData.safeParse(data).success).toBe(false);
		}
	});
	it("rejects oversized label data", () => {
		const data = graph();
		data.components[0].customData = {
			label: "x".repeat(MAX_LABEL_LENGTH + 1),
		};
		expect(ZGraphData.safeParse(data).success).toBe(false);
	});
	it("rejects oversized element records before parsing their values", () => {
		const components = Object.fromEntries(
			Array.from({ length: MAX_GRAPH_ELEMENTS + 1 }, (_, id) => [id, {}]),
		);
		expect(
			ZGraphData.safeParse({
				components,
				wires: {},
				nextId: MAX_GRAPH_ELEMENTS + 1,
			}).success,
		).toBe(false);
	});
});

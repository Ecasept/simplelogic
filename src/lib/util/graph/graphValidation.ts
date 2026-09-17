import { z } from "zod";
import type {
	ComponentHandle,
	GraphData,
	HandleReference,
	HandleType,
	WireHandle,
} from "../shared/types";

export const MAX_GRAPH_ELEMENTS = 20_000;
export const MAX_GRAPH_CONNECTIONS = 40_000;
export const MAX_LABEL_LENGTH = 10_000;
export const MAX_TEXT_LENGTH = 100_000;
export const MAX_FONT_SIZE = 1_000;
const ZLabelData = z.strictObject({
	label: z.string().max(MAX_LABEL_LENGTH).optional(),
	showLabel: z.boolean().optional(),
});
const ZTextData = z.strictObject({
	text: z.string().max(MAX_TEXT_LENGTH).optional(),
	fontSize: z.number().positive().max(MAX_FONT_SIZE).optional(),
	alignment: z.enum(["left", "center", "right"]).optional(),
});
const ZEmptyData = z.strictObject({});
const binaryPorts = { in1: "input", in2: "input", out: "output" } as const;
const ports: Record<string, Record<string, HandleType>> = {
	AND: binaryPorts,
	OR: binaryPorts,
	XOR: binaryPorts,
	NOT: { in: "input", out: "output" },
	IN: { out: "output" },
	LED: { in: "input" },
	TEXT: {},
};

/** Validate document invariants without importing the editor or its singletons.
 * Feedback loops and disconnected wire ends are valid circuit data.
 */
export function validateGraph(graph: GraphData, ctx: z.RefinementCtx) {
	function issue(path: (string | number)[], message: string) {
		ctx.addIssue({ code: "custom", path, message });
	}
	const components = Object.entries(graph.components);
	const wires = Object.entries(graph.wires);
	if (components.length + wires.length > MAX_GRAPH_ELEMENTS) {
		issue([], "Graph has too many elements");
		return;
	}
	const ids = new Set<number>();
	const edges = new Set<string>();
	const reverseEdges: { key: string; path: (string | number)[] }[] = [];
	let connectionCount = 0;
	for (const [collection, entries] of [
		["components", components],
		["wires", wires],
	] as const) {
		const type = collection === "components" ? "component" : "wire";
		for (const [key, element] of entries) {
			const path = [collection, key];
			if (String(element.id) !== key || ids.has(element.id)) {
				issue(
					[...path, "id"],
					"IDs must match their keys and be globally unique",
				);
			}
			ids.add(element.id);
			if (element.id >= graph.nextId) {
				issue(["nextId"], "nextId must exceed every existing ID");
			}
			const handles: Record<string, ComponentHandle | WireHandle> =
				element.handles;
			for (const [handleId, handle] of Object.entries(handles)) {
				const handlePath = [...path, "handles", handleId];
				connectionCount += handle.connections.length;
				if (connectionCount > MAX_GRAPH_CONNECTIONS) {
					issue([], "Graph has too many connections");
					return;
				}
				if (type === "wire" && handle.type !== handleId) {
					issue(handlePath, "Wire handle name and type must match");
				}
				if (handle.type === "input" && handle.connections.length > 1) {
					issue(handlePath, "An input may have only one connection");
				}
				const hasComponent = handle.connections.some(
					(ref) => ref.type === "component",
				);
				if (type === "wire" && hasComponent && handle.connections.length > 1) {
					issue(
						handlePath,
						"A wire end connected to a component cannot have other connections",
					);
				}
				const source = `${type}:${element.id}:${handleId}`;
				for (const [index, ref] of handle.connections.entries()) {
					const refPath = [...handlePath, "connections", index];
					const target = resolveHandle(graph, ref);
					if (
						!target ||
						target.type !== ref.handleType ||
						target.type === handle.type
					) {
						issue(
							refPath,
							"Connection must reference an existing opposite-type handle",
						);
					}
					const destination = `${ref.type}:${ref.id}:${ref.handleId}`;
					const edge = `${source}>${destination}`;
					if (edges.has(edge)) {
						issue(refPath, "Duplicate connection");
					}
					edges.add(edge);
					reverseEdges.push({ key: `${destination}>${source}`, path: refPath });
				}
			}
		}
	}
	for (const edge of reverseEdges) {
		if (!edges.has(edge.key)) {
			issue(edge.path, "Connections must be reciprocal");
		}
	}
	for (const [key, component] of components) {
		const path = ["components", key];
		const expected = ports[component.type];
		if (
			Object.keys(component.handles).length !== Object.keys(expected).length
		) {
			issue([...path, "handles"], "Incorrect handles for component type");
		}
		for (const [name, type] of Object.entries(expected)) {
			if (component.handles[name]?.type !== type) {
				issue(
					[...path, "handles", name],
					"Missing or incorrectly typed component handle",
				);
			}
		}
		for (const [name, handle] of Object.entries(component.handles)) {
			const vertical = handle.edge === "left" || handle.edge === "right";
			const length = vertical ? component.size.y : component.size.x;
			if (handle.pos > length) {
				issue(
					[...path, "handles", name, "pos"],
					"Handle lies outside the component edge",
				);
			}
		}
		let schema = ZEmptyData as z.ZodType;
		if (component.type === "TEXT") {
			schema = ZTextData;
		} else if (component.type === "IN" || component.type === "LED") {
			schema = ZLabelData;
		}
		const result = schema.safeParse(component.customData ?? {});
		if (!result.success) {
			issue([...path, "customData"], "Invalid custom data for component type");
		}
	}
}

function resolveHandle(graph: GraphData, ref: HandleReference) {
	const collection = ref.type === "wire" ? graph.wires : graph.components;
	const element = collection[ref.id];
	if (!element || !Object.hasOwn(element.handles, ref.handleId)) {
		return undefined;
	}
	return element.handles[ref.handleId];
}

import { z } from "zod";

export const ZHandleEdge = z.enum(["top", "bottom", "left", "right"]);
export const ZHandleType = z.enum(["input", "output"]);

export const ZComponentType = z.enum(["AND", "OR", "NOT", "XOR", "IN", "LED"]);

export const ZComponentConnection = z.object({
	id: z.number(),
	handleId: z.string(),
});

export const ZWireConnection = z.object({
	id: z.number(),
	handleType: ZHandleType,
});

export const ZComponentHandle = z.object({
	edge: ZHandleEdge,
	pos: z.number(),
	type: ZHandleType,
	connections: z.array(ZWireConnection),
});

export const ZComponentHandleList = z.record(z.string(), ZComponentHandle);

export const ZWireHandle = z.object({
	x: z.number(),
	y: z.number(),
	connections: z.array(ZWireConnection.or(ZComponentConnection)),
});

export const ZXYPair = z.object({
	x: z.number(),
	y: z.number(),
});

export const ZCommand = z.object({
	execute: z
		.function()
		.args(z.lazy(() => ZGraphData))
		.returns(z.void().or(z.any())),
	undo: z
		.function()
		.args(z.lazy(() => ZGraphData))
		.returns(z.void()),
});

// ==== Graph Types ====
export const ZWireData = z.object({
	id: z.number(),
	input: ZWireHandle,
	output: ZWireHandle,
});

export const ZComponentData = z.object({
	id: z.number(),
	type: ZComponentType,
	size: ZXYPair,
	position: ZXYPair,
	handles: ZComponentHandleList,
	isPoweredInitially: z.boolean(),
});

export const ZGraphData = z.object({
	wires: z.record(z.string(), ZWireData),
	components: z.record(z.string(), ZComponentData),
	nextId: z.number(),
});

export type HandleEdge = z.infer<typeof ZHandleEdge>;
export type HandleType = z.infer<typeof ZHandleType>;
export type ComponentConnection = z.infer<typeof ZComponentConnection>;
export type WireConnection = z.infer<typeof ZWireConnection>;
export type ComponentHandleList = z.infer<typeof ZComponentHandleList>;
export type WireHandle = z.infer<typeof ZWireHandle>;
export type ComponentHandle = z.infer<typeof ZComponentHandle>;
export type XYPair = z.infer<typeof ZXYPair>;
export type Command = z.infer<typeof ZCommand>;
export type WireData = z.infer<typeof ZWireData>;
export type ComponentData = z.infer<typeof ZComponentData>;
export type GraphData = z.infer<typeof ZGraphData>;
export type ComponentType = z.infer<typeof ZComponentType>;

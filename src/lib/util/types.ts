import { z } from "zod";

export const ZXYPair = z.object({
	x: z.number(),
	y: z.number(),
});

export const ZHandleEdge = z.enum(["top", "bottom", "left", "right"]);
export const ZHandleType = z.enum(["input", "output"]);

export const ZComponentType = z.enum([
	"AND",
	"OR",
	"NOT",
	"XOR",
	"IN",
	"LED",
	"TEXT",
]);

export const ZComponentHandleReference = z.object({
	id: z.number(),
	handleId: z.string(),
	handleType: ZHandleType,
	type: z.literal("component"),
});

export const ZWireHandleReference = z.object({
	id: z.number(),
	handleId: ZHandleType,
	handleType: ZHandleType,
	type: z.literal("wire"),
});

export const ZHandleReference =
	ZComponentHandleReference.or(ZWireHandleReference);

export const ZComponentHandle = z.object({
	edge: ZHandleEdge,
	pos: z.number(),
	type: ZHandleType,
	connections: z.array(ZWireHandleReference),
});

export const ZWireHandle = z.object({
	x: z.number(),
	y: z.number(),
	type: ZHandleType,
	connections: z.array(ZWireHandleReference.or(ZComponentHandleReference)),
});

export const ZComponentHandleList = z.record(z.string(), ZComponentHandle);
// Require input and output handles,
// but allow other handles on typescript level to prevent type errors
export const ZWireHandleList = z
	.object({
		input: ZWireHandle,
		output: ZWireHandle,
	})
	.and(
		z.record(
			// refinement is not recognized by typescript
			z.string().refine((val) => ["input", "output"].includes(val)),
			ZWireHandle,
		),
	);

// ==== Graph Types ====
export const ZWireData = z.object({
	id: z.number(),
	handles: ZWireHandleList,
});

export const ZComponentData = z.object({
	id: z.number(),
	type: ZComponentType,
	size: ZXYPair,
	position: ZXYPair,
	handles: ZComponentHandleList,
	isPoweredInitially: z.boolean(),
	rotation: z.number().gte(0).lt(360),
	customData: z.record(z.string(), z.any()).optional(),
});

export const ZGraphData = z.object({
	wires: z.record(z.string(), ZWireData),
	components: z.record(z.string(), ZComponentData),
	nextId: z.number(),
});

export type HandleEdge = z.infer<typeof ZHandleEdge>;
export type HandleType = z.infer<typeof ZHandleType>;
export type XYPair = z.infer<typeof ZXYPair>;
export type ComponentType = z.infer<typeof ZComponentType>;

export type ComponentHandleReference = z.infer<
	typeof ZComponentHandleReference
>;
export type WireHandleReference = z.infer<typeof ZWireHandleReference>;
export type HandleReference = z.infer<typeof ZHandleReference>;

export type ComponentHandleList = z.infer<typeof ZComponentHandleList>;
export type WireHandleList = z.infer<typeof ZWireHandleList>;

export type WireHandle = z.infer<typeof ZWireHandle>;
export type ComponentHandle = z.infer<typeof ZComponentHandle>;

export type WireData = z.infer<typeof ZWireData>;
export type ComponentData = z.infer<typeof ZComponentData>;
export type GraphData = z.infer<typeof ZGraphData>;

export interface SVGPointerEvent extends PointerEvent {
	currentTarget: EventTarget & SVGElement;
}

export interface InputInputEvent extends Event {
	currentTarget: EventTarget & HTMLInputElement;
}

export interface TextAreaInputEvent extends Event {
	currentTarget: EventTarget & HTMLTextAreaElement;
}

/** A type for a list of handles of type `HandleType` that have no connections.
 * The list needs to include all handles with the specified `HandleName`.
 * Example:
 * ```ts
 * type MyHandles = EmptyHandleList<"input" | "output", WireHandle>;
 * ```
 * This will enforce that the `MyHandles` is a component that has two handles: `input` and `output`,
 * both of type `WireHandle`, and both have no connections.
 */
export type EmptyHandleList<HandleName extends string, HandleType> = {
	handles: {
		[handle in HandleName]: HandleType & {
			connections: [];
		};
	};
};

/** Valid data for the initialization of a wire.
 * No id field (is set by the graph), and `input` and `output` handles
 * with no connections
 */
export type ValidWireInitData = Omit<WireData, "id"> &
	EmptyHandleList<"input" | "output", WireHandle>;

export type ValidComponentInitData = Omit<ComponentData, "id"> &
	EmptyHandleList<never, ComponentHandle>;

/** Creates a new reference to a the `handleType` handle of the wire with an id of `id`.
 * It takes advantage of the fact that the type of a wire handle is always its id.
 */
export function newWireHandleRef(
	id: number,
	handleType: HandleType,
): WireHandleReference {
	return {
		id,
		handleId: handleType,
		handleType,
		type: "wire",
	};
}

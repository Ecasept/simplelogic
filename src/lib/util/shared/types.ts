import { z } from "zod";
import { MAX_GRAPH_ELEMENTS, validateGraph } from "../graph/graphValidation";

const MAX_GRAPH_ID = Number.MAX_SAFE_INTEGER - 1;
const MIN_COORDINATE = -10_000_000;
const MAX_COORDINATE = 10_000_000;
const GRAPH_KEY_PATTERN = /^(0|[1-9]\d*)$/;
const MIN_COMPONENT_HANDLE_ID_LENGTH = 1;
const MAX_COMPONENT_HANDLE_ID_LENGTH = 32;
const MIN_HANDLE_POSITION = 0;
const MAX_HANDLE_POSITION = 10_000;
const MAX_CONNECTIONS_PER_HANDLE = 20_000;
const MIN_COMPONENT_SIZE = 0;
const MAX_COMPONENT_SIZE = 10_000;
const MIN_ROTATION = 0;
const MAX_ROTATION = 360;

const ZId = z.number().int().nonnegative().max(MAX_GRAPH_ID);
const ZCoordinate = z.number().min(MIN_COORDINATE).max(MAX_COORDINATE);
const ZGraphKey = z.string().regex(GRAPH_KEY_PATTERN);
// Check raw keys before Zod's record parser drops special keys such as __proto__.
const ZGraphRecordInput = z.unknown().superRefine((value, ctx) => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return;
	}
	const keys = Object.keys(value);
	if (
		keys.length > MAX_GRAPH_ELEMENTS ||
		keys.some((key) => !GRAPH_KEY_PATTERN.test(key))
	) {
		ctx.addIssue({
			code: "custom",
			message: "Invalid element keys or too many elements",
			// Do not run semantic validation on a record whose value parsing was skipped.
			fatal: true,
		});
	}
});

export const ZXYPair = z.object({
	x: ZCoordinate,
	y: ZCoordinate,
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
	id: ZId,
	handleId: z
		.string()
		.min(MIN_COMPONENT_HANDLE_ID_LENGTH)
		.max(MAX_COMPONENT_HANDLE_ID_LENGTH),
	handleType: ZHandleType,
	type: z.literal("component"),
});

export const ZWireHandleReference = z.object({
	id: ZId,
	handleId: ZHandleType,
	handleType: ZHandleType,
	type: z.literal("wire"),
});

export const ZHandleReference =
	ZComponentHandleReference.or(ZWireHandleReference);

export const ZComponentHandle = z.object({
	edge: ZHandleEdge,
	pos: z.number().min(MIN_HANDLE_POSITION).max(MAX_HANDLE_POSITION),
	type: ZHandleType,
	connections: z.array(ZWireHandleReference).max(MAX_CONNECTIONS_PER_HANDLE),
});

export const ZWireHandle = z.object({
	x: ZCoordinate,
	y: ZCoordinate,
	type: ZHandleType,
	connections: z
		.array(ZWireHandleReference.or(ZComponentHandleReference))
		.max(MAX_CONNECTIONS_PER_HANDLE),
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
	id: ZId,
	handles: ZWireHandleList,
});

export const ZComponentData = z.object({
	id: ZId,
	type: ZComponentType,
	size: z.object({
		x: z.number().gt(MIN_COMPONENT_SIZE).max(MAX_COMPONENT_SIZE),
		y: z.number().gt(MIN_COMPONENT_SIZE).max(MAX_COMPONENT_SIZE),
	}),
	position: ZXYPair,
	handles: ZComponentHandleList,
	isPoweredInitially: z.boolean(),
	rotation: z.number().gte(MIN_ROTATION).lt(MAX_ROTATION),
	customData: z.record(z.string(), z.any()).optional(),
});

const ZGraphShape = z.object({
	wires: ZGraphRecordInput.pipe(z.record(ZGraphKey, ZWireData)),
	components: ZGraphRecordInput.pipe(z.record(ZGraphKey, ZComponentData)),
	nextId: z.number().int().nonnegative().max(MAX_GRAPH_ID),
});

export const ZGraphData = ZGraphShape.superRefine(validateGraph);

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
export type GraphData = z.infer<typeof ZGraphShape>;

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

import { z } from "zod";
import { type GraphData, ZGraphData } from "./types";

const PaginationSchema = z.object({
	page: z.number(),
	limit: z.number(),
	hasNextPage: z.boolean(),
});

const GraphListItemSchema = z.object({
	name: z.string(),
	id: z.number(),
});

const ListRequestDataSchema = z.object({
	graphs: z.array(GraphListItemSchema),
	pagination: PaginationSchema,
});

const APIResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.discriminatedUnion("success", [
		z.object({
			success: z.literal(true),
			data: dataSchema,
		}),
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
	]);

export type ListRequestData = z.infer<typeof ListRequestDataSchema>;

// Zod can't correctly infer this type, so we have to define it manually
// export type APIResponse<T> = z.infer<
// 	ReturnType<typeof APIResponseSchema<z.ZodType<T>>>
// >;
export type APIResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export namespace API {
	export async function saveCircuit(
		name: string,
		circuitData: GraphData,
	): Promise<APIResponse<null>> {
		try {
			const response = await fetch("/api/graphs", {
				method: "POST",
				body: JSON.stringify({ name, graphData: circuitData }),
				headers: { "Content-type": "application/json" },
			});
			const validationResult = APIResponseSchema(z.null()).safeParse(
				await response.json(),
			);
			if (!validationResult.success) {
				return { success: false, error: "Invalid API response format" };
			}
			const data = validationResult.data;

			return data.success
				? { success: true, data: null }
				: { success: false, error: data.error };
		} catch (error) {
			return { success: false, error: "Network error" };
		}
	}

	export async function loadCircuitList(
		page: number,
	): Promise<APIResponse<ListRequestData>> {
		try {
			const response = await fetch(`/api/graphs?page=${page}&limit=10`, {
				method: "GET",
			});
			const validationResult = APIResponseSchema(
				ListRequestDataSchema,
			).safeParse(await response.json());
			if (!validationResult.success) {
				return { success: false, error: "Invalid API response format" };
			}
			const data = validationResult.data;

			if (data.success) {
				return { success: true, data: data.data };
			} else {
				return { success: false, error: data.error };
			}
		} catch (error) {
			return { success: false, error: "Network error" };
		}
	}

	export async function loadCircuit(
		id: number,
	): Promise<APIResponse<GraphData>> {
		try {
			const response = await fetch(`/api/graphs/${id}`, {
				method: "GET",
			});
			const validationResult = APIResponseSchema(ZGraphData).safeParse(
				await response.json(),
			);
			if (!validationResult.success) {
				return { success: false, error: "Invalid API response format" };
			}
			const data = validationResult.data;

			if (data.success) {
				return { success: true, data: data.data };
			} else {
				return { success: false, error: data.error };
			}
		} catch (error) {
			return { success: false, error: "Network error" };
		}
	}
}

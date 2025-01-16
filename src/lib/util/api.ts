import { z } from "zod";
import { type GraphData, ZGraphData } from "./types";

const PaginationSchema = z.object({
	page: z.number(),
	perPage: z.number(),
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
	z
		.object({
			success: z.literal(true),
			data: dataSchema,
		})
		.or(
			z.object({
				success: z.literal(false),
				error: z.string(),
			}),
		);

export type ListRequestData = z.infer<typeof ListRequestDataSchema>;

export type APIResponse<T> = z.infer<
	ReturnType<typeof APIResponseSchema<z.ZodType<T>>>
>;
export namespace API {
	interface FetchOptions {
		method: "GET" | "POST";
		body?: any;
		headers?: HeadersInit;
	}

	async function makeAPIRequest<T>(
		url: string,
		schema: z.ZodType<T>,
		options: FetchOptions,
	): Promise<APIResponse<T>> {
		try {
			const fetchOptions: RequestInit = {
				method: options.method,
				headers: {
					"Content-Type": "application/json",
					...options.headers,
				},
			};

			if (options.body) {
				fetchOptions.body = JSON.stringify(options.body);
			}

			const response = await fetch(url, fetchOptions);
			const validationResult = APIResponseSchema(schema).safeParse(
				await response.json(),
			);

			if (!validationResult.success) {
				console.error(validationResult.error);
				return { success: false, error: "Invalid API response format" };
			}

			return validationResult.data;
		} catch (error) {
			console.error(error);
			return { success: false, error: "Network error" };
		}
	}

	export function saveCircuit(
		name: string,
		circuitData: GraphData,
	): Promise<APIResponse<null>> {
		return makeAPIRequest("/api/graphs", z.null(), {
			method: "POST",
			body: { name, data: circuitData },
		});
	}

	export function loadCircuitList(
		page: number,
	): Promise<APIResponse<ListRequestData>> {
		return makeAPIRequest(
			`/api/graphs?page=${page}&perPage=10`,
			ListRequestDataSchema,
			{ method: "GET" },
		);
	}

	export function loadCircuit(id: number): Promise<APIResponse<GraphData>> {
		return makeAPIRequest(`/api/graphs/${id}`, ZGraphData, { method: "GET" });
	}

	export function login(password: string): Promise<APIResponse<null>> {
		return makeAPIRequest("/api/auth/login", z.null(), {
			method: "POST",
			body: { password },
		});
	}

	export function logout(): Promise<APIResponse<null>> {
		return makeAPIRequest("/api/auth/logout", z.null(), { method: "POST" });
	}
}

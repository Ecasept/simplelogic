import { z } from "zod";
import { err } from "./error";
import { type GraphData, ZGraphData } from "./types";

const PaginationSchema = z.object({
	page: z.number(),
	perPage: z.number(),
	hasNextPage: z.boolean(),
});

const CircuitListItemSchema = z.object({
	name: z.string(),
	id: z.number(),
	wireCount: z.number(),
	componentCount: z.number(),
	createdAt: z.string(), // ISO date string
});

const ListRequestDataSchema = z.object({
	circuits: z.array(CircuitListItemSchema),
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
		)
		.and(
			// SvelteKit error handling requires a message field
			z.object({
				message: z.string().optional(),
			}),
		);

export type ListRequestData = z.infer<typeof ListRequestDataSchema>;

export type APIResponse<T> = z.infer<
	ReturnType<typeof APIResponseSchema<z.ZodType<T>>>
>;
export namespace API {
	interface FetchOptions {
		method: "GET" | "POST" | "DELETE";
		body?: any;
		headers?: HeadersInit;
	}

	/** Makes a request to the API and validates the response
	 * @param url - The API endpoint to call
	 * @param schema - The Zod schema to validate the response data
	 * @param options - The request options including method, body, and headers
	 * @returns A promise that resolves to the validated API response
	 */
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
				return err("Invalid API response format");
			}

			return validationResult.data;
		} catch (error) {
			console.error(error);
			return err("Network error");
		}
	}

	export function saveCircuit(
		name: string,
		circuitData: GraphData,
	): Promise<APIResponse<null>> {
		return makeAPIRequest("/api/circuits", z.null(), {
			method: "POST",
			body: { name, data: circuitData },
		});
	}

	export function loadCircuitList(
		page: number,
	): Promise<APIResponse<ListRequestData>> {
		return makeAPIRequest(
			`/api/circuits?page=${page}&perPage=10`,
			ListRequestDataSchema,
			{ method: "GET" },
		);
	}

	export function loadCircuit(id: number): Promise<APIResponse<GraphData>> {
		return makeAPIRequest(`/api/circuits/${id}`, ZGraphData, { method: "GET" });
	}

	export function deleteCircuit(id: number): Promise<APIResponse<null>> {
		return makeAPIRequest(`/api/circuits/${id}`, z.null(), {
			method: "DELETE",
		});
	}
}

import { z } from "zod";
import zu from "zod_utilz";
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

const PresetResponseSchema = z
	.object({
		id: z.number().int().nonnegative(),
		name: z.string(),
		img: z
			.string(),
		data: zu.stringToJSON().pipe(ZGraphData),
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
	async function makeAPIRequest<T extends z.ZodType>(
		url: string,
		schema: T,
		options: FetchOptions,
	): Promise<APIResponse<z.infer<T>>> {
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
	): Promise<APIResponse<z.infer<typeof ListRequestDataSchema>>> {
		return makeAPIRequest(
			`/api/circuits?page=${page}&perPage=10`,
			ListRequestDataSchema,
			{ method: "GET" },
		);
	}

	export function loadCircuit(id: number) {
		return makeAPIRequest(`/api/circuits/${id}`, ZGraphData, { method: "GET" });
	}

	export function deleteCircuit(id: number) {
		return makeAPIRequest(`/api/circuits/${id}`, z.null(), {
			method: "DELETE",
		});
	}

	export function getPresetById(id: number) {
		return makeAPIRequest(`/api/preset?id=${id}`, PresetResponseSchema, {
			method: "GET",
		});
	}
}

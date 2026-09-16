import { error } from "@sveltejs/kit";
import { z } from "zod";
import { ZGraphData } from "$lib/util/types";
import { err } from "$lib/util/error";

export const MAX_CIRCUIT_BODY_BYTES = 8 * 1024 * 1024;
export const ZCircuitInput = z.strictObject({
	name: z.string().trim().min(1).max(200),
	data: ZGraphData,
});

/** Count actual streamed bytes; Content-Length alone is not trustworthy. */
export async function readCircuitInput(request: Request) {
	if (!request.body) {
		error(400, err("Missing request body"));
	}
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let text = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			size += value.byteLength;
			if (size > MAX_CIRCUIT_BODY_BYTES) {
				await reader.cancel();
				error(413, err("Circuit is too large"));
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
	} finally {
		reader.releaseLock();
	}
	let input: unknown;
	try {
		input = JSON.parse(text);
	} catch {
		error(400, err("Invalid JSON"));
	}
	const result = ZCircuitInput.safeParse(input);
	if (!result.success) {
		error(400, err("Invalid circuit data or name"));
	}
	return result.data;
}

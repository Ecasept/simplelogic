import { afterEach, expect, it, vi } from "vitest";
import { API } from "./api";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it("passes cancellation to fetch and propagates aborted requests", async () => {
	const controller = new AbortController();
	const fetchMock = vi.fn(
		(_url: string, options: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				options.signal?.addEventListener("abort", () =>
					reject(options.signal?.reason),
				);
			}),
	);
	vi.stubGlobal("fetch", fetchMock);
	const request = API.loadCircuit(1, controller.signal);
	controller.abort();
	await expect(request).rejects.toMatchObject({ name: "AbortError" });
	expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
});

it("rejects semantically invalid graphs received from the API", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						success: true,
						data: { components: {}, wires: {}, nextId: -1 },
					}),
				),
		),
	);
	expect(await API.loadCircuit(1)).toEqual({
		success: false,
		error: "Invalid API response format",
		message: "Invalid API response format",
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreSession } from "./session";
import { decodeDocument } from "./document";
const empty = (nextId = 0) => ({ components: {}, wires: {}, nextId });
const replaceDocument = vi.fn(async (input: unknown) => {
	decodeDocument(input);
});
beforeEach(() => {
	sessionStorage.clear();
	vi.clearAllMocks();
});

describe("session recovery", () => {
	it.each(["{", JSON.stringify({ ...empty(), nextId: -1 })])(
		"recovers malformed stored documents",
		async (input) => {
			sessionStorage.setItem("currentCircuit", input);
			const result = await restoreSession(sessionStorage, replaceDocument);
			expect(result.error).toBeTruthy();
			expect(result.restored).toBe(false);
			expect(sessionStorage.getItem("currentCircuit")).toBeNull();
			expect(replaceDocument).toHaveBeenCalledWith(input);
		},
	);
	it("restores through validation and consumes authentication return state", async () => {
		sessionStorage.setItem(
			"currentCircuit",
			JSON.stringify({ ...empty(8), ignored: true }),
		);
		sessionStorage.setItem("signInSource", "saveModal");
		const result = await restoreSession(sessionStorage, replaceDocument);
		expect(result).toEqual({
			restored: true,
			source: "saveModal",
			error: null,
		});
		expect(replaceDocument).toHaveBeenCalledOnce();
		expect(sessionStorage.length).toBe(0);
	});
	it("handles unavailable browser storage", async () => {
		const storage = {
			getItem: () => {
				throw new Error("denied");
			},
			removeItem: vi.fn(),
		};
		expect((await restoreSession(storage, replaceDocument)).error).toBeTruthy();
	});
	it("strips unknown properties in decoded clipboard JSON", () => {
		expect(
			decodeDocument(JSON.stringify({ ...empty(), ignored: true })),
		).toEqual(empty());
	});
});

it("does not report a cancelled replacement as restored", async () => {
	sessionStorage.setItem("currentCircuit", JSON.stringify(empty()));
	const result = await restoreSession(sessionStorage, async () => false);
	expect(result.restored).toBe(false);
	expect(result.error).toBeNull();
});

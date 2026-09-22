import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CircuitModalViewModel,
	feedbackFor,
} from "./circuitModalViewModel.svelte";
import { API, type APIResponse, type ListRequestData } from "./api";
import type { GraphData } from "../shared/types";
import halfAdder from "../../server/presets/halfAdder.json";
import { decodeDocument } from "./document";
import { graphManager } from "../graph/graph.svelte";
import { EditorViewModel } from "../editor/editorViewModel.svelte";

const empty = (nextId = 0): GraphData => ({
	components: {},
	wires: {},
	nextId,
});
const list = (page: number): ListRequestData => ({
	circuits: [],
	pagination: { page, perPage: 10, hasNextPage: true },
});
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
let modal: CircuitModalViewModel;
const onLoad = vi.fn(async () => true);
beforeEach(() => {
	modal = new CircuitModalViewModel();
	onLoad.mockClear();
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { readText: vi.fn(), writeText: vi.fn() },
	});
});
afterEach(() => {
	modal.close();
	vi.restoreAllMocks();
});

describe("modal lifetime", () => {
	it.each([false, true])(
		"discards a saved-circuit response after close (reopen: %s)",
		async (reopen) => {
			const response = deferred<APIResponse<GraphData>>();
			const api = vi
				.spyOn(API, "loadCircuit")
				.mockReturnValue(response.promise);
			modal.openLoad({ onLoad });
			const pending = modal.loadCircuit(1);
			const signal = api.mock.calls[0][1]!;
			modal.close();
			const nextLoad = vi.fn(async () => true);
			if (reopen) modal.openLoad({ onLoad: nextLoad });
			response.resolve({ success: true, data: empty(8) });
			await pending;
			expect(signal.aborted).toBe(true);
			expect(onLoad).not.toHaveBeenCalled();
			expect(nextLoad).not.toHaveBeenCalled();
			expect(feedbackFor(modal.uiState)).toBeNull();
			expect(modal.uiState.mode).toBe(reopen ? "load" : "closed");
		},
	);

	it("cancels non-abortable clipboard work when reopened", async () => {
		const clipboard = deferred<string>();
		vi.mocked(navigator.clipboard.readText).mockReturnValue(clipboard.promise);
		modal.openLoad({ onLoad });
		const pending = modal.pasteCircuitFromClipboard();
		modal.openSave();
		clipboard.resolve(JSON.stringify(empty(8)));
		await pending;
		expect(onLoad).not.toHaveBeenCalled();
		expect(modal.uiState.mode).toBe("save");
		expect(feedbackFor(modal.uiState)).toBeNull();
	});

	it("keeps the newest load when two requests finish out of order", async () => {
		const older = deferred<APIResponse<GraphData>>();
		vi.spyOn(API, "loadCircuit")
			.mockReturnValueOnce(older.promise)
			.mockResolvedValueOnce({ success: true, data: empty(2) });
		modal.openLoad({ onLoad });
		const first = modal.loadCircuit(1);
		await modal.loadCircuit(2);
		older.resolve({ success: true, data: empty(1) });
		await first;
		expect(onLoad).toHaveBeenCalledExactlyOnceWith(
			{ graph: empty(2), origin: "custom" },
			expect.any(AbortSignal),
		);
	});

	it("does not close a reopened dialog when an old onboarding replacement finishes", async () => {
		const replacement = deferred<boolean>();
		const apply = vi.fn(() => replacement.promise);
		modal.openLoad({ onLoad: apply, isOnboarding: true });
		const pending = modal.loadPreset("empty");
		modal.openSave();
		replacement.resolve(true);
		await pending;
		expect(apply.mock.calls[0]).toBeDefined();
		expect(modal.uiState.mode).toBe("save");
		expect(feedbackFor(modal.uiState)).toBeNull();
	});

	it("constructs fresh state and derives editor blocking from the actual modal", async () => {
		const editor = new EditorViewModel();
		editor.bindModal(modal);
		modal.openLoad({ onLoad, isOnboarding: true });
		modal.setFixConnections(true);
		editor.hardReset();
		expect(editor.isBlocked).toBe(true);
		modal.openLoad({ onLoad });
		expect(modal.uiState).toMatchObject({
			mode: "load",
			fixConnections: false,
			isOnboarding: false,
			action: { status: "idle" },
			screen: { type: "options" },
		});
		await modal.loadPreset("empty");
		expect(editor.isBlocked).toBe(true);
		modal.close();
		expect(editor.isBlocked).toBe(false);
		modal.openLoad({ onLoad, isOnboarding: true });
		await modal.loadPreset("empty");
		expect(editor.isBlocked).toBe(false);
	});
});

describe("pagination", () => {
	it("keeps the latest page and its loading flag when an older request settles", async () => {
		const first = deferred<APIResponse<ListRequestData>>();
		const second = deferred<APIResponse<ListRequestData>>();
		vi.spyOn(API, "loadCircuitList")
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		modal.openLoad({ onLoad });
		const one = modal.loadCircuitList(1);
		const two = modal.loadCircuitList(2);
		first.resolve({ success: false, error: "old failure" });
		await one;
		expect(modal.uiState).toMatchObject({
			screen: { request: { status: "loading" } },
		});
		expect(feedbackFor(modal.uiState)).toBeNull();
		second.resolve({ success: true, data: list(2) });
		await two;
		expect(modal.uiState).toMatchObject({
			screen: { request: { status: "ready", data: list(2) } },
		});
	});

	it("does not replace a newer page with a late older result", async () => {
		const first = deferred<APIResponse<ListRequestData>>();
		vi.spyOn(API, "loadCircuitList")
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce({ success: true, data: list(2) });
		modal.openLoad({ onLoad });
		const one = modal.loadCircuitList(1);
		await modal.loadCircuitList(2);
		first.resolve({ success: true, data: list(1) });
		await one;
		expect(modal.uiState).toMatchObject({
			screen: { request: { status: "ready", data: list(2) } },
		});
	});

	it("clears loading on failure and ignores rejection after reopening", async () => {
		const failed = deferred<APIResponse<ListRequestData>>();
		vi.spyOn(API, "loadCircuitList")
			.mockRejectedValueOnce(new Error("offline"))
			.mockReturnValueOnce(failed.promise);
		modal.openLoad({ onLoad });
		await modal.loadCircuitList(1);
		expect(modal.uiState).toMatchObject({
			screen: { request: { status: "error", message: "offline" } },
		});
		const pending = modal.loadCircuitList(2);
		modal.openSave();
		failed.reject(new Error("old error"));
		await pending;
		expect(feedbackFor(modal.uiState)).toBeNull();
	});

	it("does not navigate backwards when deletion finishes after a page change", async () => {
		const deletion = deferred<APIResponse<null>>();
		vi.spyOn(API, "deleteCircuit").mockReturnValue(deletion.promise);
		const pages = vi
			.spyOn(API, "loadCircuitList")
			.mockResolvedValueOnce({ success: true, data: list(2) })
			.mockResolvedValueOnce({ success: true, data: list(3) });
		modal.openLoad({ onLoad });
		await modal.loadCircuitList(2);
		const pending = modal.deleteCircuit(1, true);
		await modal.loadCircuitList(3);
		deletion.resolve({ success: true, data: null });
		await pending;
		expect(pages).toHaveBeenCalledTimes(2);
		expect(modal.uiState).toMatchObject({
			screen: { request: { status: "ready", data: list(3) } },
		});
	});
});

describe("validation and failures", () => {
	it.each(["{", JSON.stringify({ ...empty(), nextId: -1 })])(
		"rejects invalid clipboard input before applying it",
		async (input) => {
			vi.mocked(navigator.clipboard.readText).mockResolvedValue(input);
			modal.openLoad({ onLoad });
			modal.setFixConnections(true);
			await modal.pasteCircuitFromClipboard();
			expect(onLoad).not.toHaveBeenCalled();
			expect(feedbackFor(modal.uiState)?.type).toBe("error");
			expect(modal.uiState).toMatchObject({ action: { status: "error" } });
		},
	);

	it("passes parsed data instead of raw clipboard objects", async () => {
		vi.mocked(navigator.clipboard.readText).mockResolvedValue(
			JSON.stringify({ ...empty(4), ignored: true }),
		);
		modal.openLoad({ onLoad });
		await modal.pasteCircuitFromClipboard();
		expect(onLoad).toHaveBeenCalledWith(
			{ graph: empty(4), origin: "custom" },
			expect.any(AbortSignal),
		);
	});

	it.each(["readText", "writeText"] as const)(
		"reports denied clipboard %s",
		async (method) => {
			vi.mocked(navigator.clipboard[method]).mockRejectedValue(
				new Error("Clipboard access denied"),
			);
			if (method === "readText") {
				modal.openLoad({ onLoad });
				await modal.pasteCircuitFromClipboard();
			} else {
				modal.openSave();
				await modal.copyCircuitToClipboard();
			}
			expect(feedbackFor(modal.uiState)).toEqual({
				type: "error",
				message: "Clipboard access denied",
			});
		},
	);

	it("validates a preset before invoking the replacement handler", async () => {
		vi.spyOn(API, "getPresetById").mockResolvedValue({
			success: true,
			data: {
				id: 1,
				name: "invalid",
				img: "",
				data: { ...empty(), nextId: -1 },
			},
		});
		modal.openLoad({ onLoad });
		await modal.loadPreset(1);
		expect(onLoad).not.toHaveBeenCalled();
		expect(feedbackFor(modal.uiState)?.type).toBe("error");
	});

	it("ignores clipboard write completion after reopening", async () => {
		const write = deferred<void>();
		vi.mocked(navigator.clipboard.writeText).mockReturnValue(write.promise);
		modal.openSave();
		const pending = modal.copyCircuitToClipboard();
		modal.openLoad({ onLoad });
		write.resolve();
		await pending;
		expect(feedbackFor(modal.uiState)).toBeNull();
	});
});

it("suppresses duplicate saves and ignores save results after reopening", async () => {
	vi.spyOn(graphManager, "getGraphData").mockReturnValue(
		decodeDocument(halfAdder),
	);
	const response = deferred<APIResponse<null>>();
	const save = vi.spyOn(API, "saveCircuit").mockReturnValue(response.promise);
	modal.openSave();
	const pending = modal.saveCircuit("  example  ");
	await modal.saveCircuit("example");
	expect(save).toHaveBeenCalledTimes(1);
	expect(save.mock.calls[0][0]).toBe("example");
	modal.openLoad({ onLoad });
	expect(save.mock.calls[0][2]?.aborted).toBe(true);
	response.resolve({ success: true, data: null });
	await pending;
	expect(feedbackFor(modal.uiState)).toBeNull();
});

it("does not refresh a reopened modal after deletion", async () => {
	const response = deferred<APIResponse<null>>();
	vi.spyOn(API, "deleteCircuit").mockReturnValue(response.promise);
	const pages = vi.spyOn(API, "loadCircuitList");
	modal.openLoad({ onLoad });
	const pending = modal.deleteCircuit(1, false);
	modal.openLoad({ onLoad });
	response.resolve({ success: true, data: null });
	await pending;
	expect(pages).not.toHaveBeenCalled();
	expect(feedbackFor(modal.uiState)).toBeNull();
});

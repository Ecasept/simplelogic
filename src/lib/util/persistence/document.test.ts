import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	canvasViewModel,
	documentActions,
	graphManager,
	editorViewModel,
	interactionController,
	modeActions,
	circuitModalViewModel,
	persistenceActions,
} from "../editor/editor.svelte";
import { API } from "./api";
import { simController } from "../graph/simulation.svelte";

const empty = (nextId = 0) => ({ components: {}, wires: {}, nextId });
function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

beforeEach(() => {
	vi.spyOn(canvasViewModel, "clientToSVGCoords").mockImplementation(
		(pos) => pos as DOMPoint,
	);
	interactionController.cancel();
	circuitModalViewModel.close();
	editorViewModel.hardReset();
	graphManager.clear();
	graphManager.notifyAll();
	sessionStorage.clear();
});
afterEach(async () => {
	await simController.clear();
	vi.restoreAllMocks();
});

describe("document replacement", () => {
	it("leaves an active preview untouched for an already cancelled request", async () => {
		interactionController.addComponent("AND", { x: 0, y: 0 }, "keyboard", null);
		const preview = graphManager.currentEdit;
		expect(
			await documentActions.replaceDocument(empty(9), AbortSignal.abort()),
		).toBe(false);
		expect(graphManager.currentEdit).toBe(preview);
		expect(editorViewModel.isBlocked).toBe(false);
	});

	it("skips a cancelled queued replacement without stopping simulation again", async () => {
		const stopped = deferred();
		const shutdown = vi
			.spyOn(simController, "stopLoop")
			.mockReturnValueOnce(stopped.promise);
		const first = documentActions.replaceDocument(empty(4));
		const cancellation = new AbortController();
		const second = documentActions.replaceDocument(
			empty(5),
			cancellation.signal,
		);
		cancellation.abort();
		stopped.resolve();
		expect(await first).toBe(true);
		expect(await second).toBe(false);
		expect(shutdown).toHaveBeenCalledTimes(1);
		expect(graphManager.getGraphData()).toEqual(empty(4));
		expect(editorViewModel.isBlocked).toBe(false);
	});

	it("discards the old interaction when replacing the document", async () => {
		interactionController.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		await documentActions.replaceDocument({
			components: {},
			wires: {},
			nextId: 9,
		});
		interactionController.pointerUp({
			pointerId: 1,
			clientX: 100,
			clientY: 100,
			shiftKey: false,
			button: 0,
		});
		expect(interactionController.state.kind).toBe("idle");
		expect(graphManager.currentEdit).toBeNull();
		expect(graphManager.getGraphData()).toEqual({
			components: {},
			wires: {},
			nextId: 9,
		});
	});

	it("rejects invalid input before cancelling a preview or changing history", async () => {
		interactionController.addComponent("AND", { x: 0, y: 0 }, "keyboard", null);
		const preview = graphManager.currentEdit;
		await expect(
			documentActions.replaceDocument({ ...empty(), nextId: -1 }),
		).rejects.toThrow();
		expect(graphManager.currentEdit).toBe(preview);
		expect(editorViewModel.uiState.isProcessBlocked).toBe(false);
	});
	it("waits for shutdown, blocks new interactions, and serializes replacements", async () => {
		const stopped = deferred();
		const shutdown = vi
			.spyOn(simController, "stopLoop")
			.mockReturnValueOnce(stopped.promise)
			.mockResolvedValue(undefined);
		graphManager.setGraphData(empty(3));
		const first = documentActions.replaceDocument(empty(4));
		const second = documentActions.replaceDocument(empty(5));
		await Promise.resolve();
		expect(shutdown).toHaveBeenCalledTimes(1);
		expect(graphManager.getGraphData().nextId).toBe(3);
		interactionController.addComponent("AND", { x: 0, y: 0 }, "keyboard", null);
		await modeActions.switchToSimulateMode();
		expect(interactionController.state.kind).toBe("idle");
		expect(editorViewModel.uiState.mode).toBe("edit");
		stopped.resolve();
		await Promise.all([first, second]);
		expect(graphManager.getGraphData().nextId).toBe(5);
		expect(editorViewModel.uiState.isProcessBlocked).toBe(false);
	});
	it("uses owned parsed data and clears selection/history while preserving settings and modal", async () => {
		persistenceActions.loadGraphManually();
		editorViewModel.applySettings({ gridSnap: false });
		editorViewModel.setSelected({ id: 42, type: "component" });
		const input = { ...empty(7), ignored: true };
		const loading = documentActions.replaceDocument(input);
		input.nextId = 99;
		await loading;
		expect(graphManager.getGraphData()).toEqual(empty(7));
		expect(graphManager.historyEmpty).toBe(true);
		expect(editorViewModel.uiState.selected.size).toBe(0);
		expect(editorViewModel.uiState.settings.gridSnap).toBe(false);
		expect(editorViewModel.uiState.isModalOpen).toBe(true);
	});
	it("recovers the replacement queue after shutdown fails", async () => {
		vi.spyOn(simController, "stopLoop").mockRejectedValueOnce(
			new Error("shutdown"),
		);
		await expect(documentActions.replaceDocument(empty(1))).rejects.toThrow(
			"shutdown",
		);
		expect(editorViewModel.uiState.isProcessBlocked).toBe(false);
		await documentActions.replaceDocument(empty(2));
		expect(graphManager.getGraphData()).toEqual(empty(2));
	});
	it("clears through the same lifecycle while simulation is running", async () => {
		interactionController.addComponent("IN", { x: 0, y: 0 }, "keyboard", null);
		interactionController.commit();
		await modeActions.switchToSimulateMode();
		expect(simController.loopRunning).toBe(true);
		await documentActions.clearDocument();
		expect(simController.loopRunning).toBe(false);
		expect(simController.state).toEqual({});
		expect(simController.queue).toEqual([]);
		expect(graphManager.getGraphData()).toEqual(empty());
		expect(editorViewModel.uiState.mode).toBe("edit");
	});
	it("does not install a request invalidated during shutdown", async () => {
		const stopped = deferred();
		vi.spyOn(simController, "stopLoop").mockReturnValueOnce(stopped.promise);
		const controller = new AbortController();
		const loading = documentActions.replaceDocument(
			empty(8),
			controller.signal,
		);
		await Promise.resolve();
		controller.abort();
		stopped.resolve();
		expect(await loading).toBe(false);
		expect(graphManager.getGraphData()).toEqual(empty());
	});
});

it("cancels modal document replacement during simulation shutdown", async () => {
	const stopped = deferred();
	vi.spyOn(simController, "stopLoop").mockReturnValueOnce(stopped.promise);
	vi.spyOn(API, "loadCircuit").mockResolvedValue({
		success: true,
		data: empty(8),
	});
	persistenceActions.loadGraphManually();
	const loading = circuitModalViewModel.loadCircuit(1);
	await Promise.resolve();
	await Promise.resolve();
	expect(editorViewModel.uiState.isProcessBlocked).toBe(true);
	persistenceActions.closeModal();
	persistenceActions.saveGraph();
	stopped.resolve();
	await loading;
	expect(graphManager.getGraphData()).toEqual(empty());
	expect(circuitModalViewModel.uiState.mode).toBe("save");
	expect(circuitModalViewModel.uiState).toMatchObject({
		mode: "save",
		action: { status: "idle" },
	});
	expect(editorViewModel.isBlocked).toBe(true);
});

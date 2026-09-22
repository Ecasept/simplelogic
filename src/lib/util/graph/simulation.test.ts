import { afterEach, expect, it, vi } from "vitest";
import { simController, simulation } from "./simulation.svelte";
import { graphManager } from "./graph.svelte";
import { constructComponent } from "../shared/global.svelte";

afterEach(async () => {
	await simController.clear();
	graphManager.clear();
	simController.continuousExecution = true;
	simController.updateDelay = 16;
	vi.restoreAllMocks();
	vi.useRealTimers();
});

function loadInput() {
	graphManager.setGraphData({
		components: {
			0: {
				...constructComponent("IN", { x: 0, y: 0 }),
				id: 0,
				isPoweredInitially: true,
			},
		},
		wires: {},
		nextId: 1,
	});
}

it("publishes step results in place without leaking unflushed solver changes", () => {
	loadInput();
	simController.continuousExecution = false;
	simController.start();
	const entry = simController.state[0];
	expect(entry.outputs.out).toBe(false);
	expect(simController.queue).toEqual([0]);
	simulation.step();
	expect(simulation._state[0].outputs.out).toBe(true);
	expect(entry.outputs.out).toBe(false);
	simController.stepForward();
	expect(simController.state[0]).toBe(entry);
	expect(entry.outputs.out).toBe(true);
	expect(simController.queue).toEqual([]);
	graphManager.graphData.components[0].isPoweredInitially = false;
	simController.recomputeComponent(0);
	simController.stepForward();
	expect(entry.outputs.out).toBe(false);
});

it("flushes zero-delay results when the continuous loop completes", async () => {
	vi.useFakeTimers();
	loadInput();
	simController.updateDelay = 0;
	simController.start();
	expect(simController.state[0].outputs.out).toBe(false);
	await vi.advanceTimersByTimeAsync(20);
	expect(simController.loopRunning).toBe(false);
	expect(simController.state[0].outputs.out).toBe(true);
	expect(simController.queue).toEqual([]);
});

it("clears unpublished changes without retaining old simulation entries", async () => {
	loadInput();
	simController.continuousExecution = false;
	simController.start();
	simulation.step();
	await simController.clear();
	expect(simController.state).toEqual({});
	expect(simController.queue).toEqual([]);
});

it("settles concurrent shutdown requests before the first animation frame", async () => {
	vi.useFakeTimers();
	simController.start();
	expect(simController.loopRunning).toBe(true);
	await Promise.all([simController.stopLoop(), simController.stopLoop()]);
	expect(simController.loopRunning).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
});

it("can start a fresh loop after cancellation", async () => {
	vi.useFakeTimers();
	simController.start();
	await simController.stopLoop();
	simController.start();
	expect(simController.loopRunning).toBe(true);
	await vi.advanceTimersByTimeAsync(20);
	expect(simController.loopRunning).toBe(false);
});

it("cancels a pending loop delay and performs no more steps", async () => {
	vi.useFakeTimers();
	const step = vi.spyOn(simulation, "step").mockReturnValue(true);
	simController.start();
	await vi.advanceTimersByTimeAsync(17);
	expect(step).toHaveBeenCalled();
	await simController.stopLoop();
	const count = step.mock.calls.length;
	await vi.advanceTimersByTimeAsync(1000);
	expect(step).toHaveBeenCalledTimes(count);
	expect(vi.getTimerCount()).toBe(0);
});

it("does not stop or clear an already cancelled request", async () => {
	vi.useFakeTimers();
	simController.start();
	const state = simulation._state;
	expect(await simController.clear(AbortSignal.abort())).toBe(false);
	expect(simController.loopRunning).toBe(true);
	expect(simulation._state).toBe(state);
});

it("preserves runtime data when clearing is cancelled during shutdown", async () => {
	vi.useFakeTimers();
	simController.start();
	const state = simulation._state;
	const queue = simulation._queue;
	const controller = new AbortController();
	const clearing = simController.clear(controller.signal);
	controller.abort();
	expect(await clearing).toBe(false);
	expect(simController.loopRunning).toBe(false);
	expect(simulation._state).toBe(state);
	expect(simulation._queue).toBe(queue);
});

import { afterEach, expect, it, vi } from "vitest";
import { simController, simulation } from "./simulation.svelte";

afterEach(async () => {
	await simController.clear();
	vi.restoreAllMocks();
	vi.useRealTimers();
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

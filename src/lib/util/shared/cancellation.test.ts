import { afterEach, expect, it, vi } from "vitest";
import { cancellationDelay, cancellationFrame } from "./cancellation";

afterEach(() => vi.useRealTimers());

it("settles an aborted delay and removes its timer", async () => {
	vi.useFakeTimers();
	const controller = new AbortController();
	const wait = cancellationDelay(60000, controller.signal);
	controller.abort();
	await wait;
	expect(vi.getTimerCount()).toBe(0);
});

it("cancels an animation frame without waiting for rendering", async () => {
	vi.useFakeTimers();
	const controller = new AbortController();
	const wait = cancellationFrame(controller.signal);
	controller.abort();
	await wait;
	expect(vi.getTimerCount()).toBe(0);
});

it("does not schedule work for an already cancelled token", async () => {
	vi.useFakeTimers();
	const signal = AbortSignal.abort();
	await cancellationDelay(60000, signal);
	await cancellationFrame(signal);
	expect(vi.getTimerCount()).toBe(0);
});

it("releases the abort listener on normal completion", async () => {
	vi.useFakeTimers();
	const controller = new AbortController();
	const remove = vi.spyOn(controller.signal, "removeEventListener");
	const wait = cancellationDelay(10, controller.signal);
	await vi.advanceTimersByTimeAsync(10);
	await wait;
	expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
	controller.abort();
	expect(vi.getTimerCount()).toBe(0);
});

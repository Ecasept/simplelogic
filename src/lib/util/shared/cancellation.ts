/** Cancellable scheduler waits. Cancellation settles the wait and releases its resource. */
function waitFor(
	signal: AbortSignal,
	schedule: (done: () => void) => () => void,
): Promise<void> {
	if (signal.aborted) return Promise.resolve();
	return new Promise((resolve) => {
		const finish = () => {
			cleanup();
			signal.removeEventListener("abort", finish);
			resolve();
		};
		const cleanup = schedule(finish);
		signal.addEventListener("abort", finish, { once: true });
	});
}

export function cancellationDelay(ms: number, signal: AbortSignal) {
	return waitFor(signal, (done) => {
		const timer = setTimeout(done, ms);
		return () => clearTimeout(timer);
	});
}

export function cancellationFrame(signal: AbortSignal) {
	return waitFor(signal, (done) => {
		const frame = requestAnimationFrame(done);
		return () => cancelAnimationFrame(frame);
	});
}

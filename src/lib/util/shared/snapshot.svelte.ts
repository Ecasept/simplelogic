/** Independent plain data for undo, clipboard, and drag origins, including proxies. */
export function snapshot<T>(value: T): T {
	return $state.snapshot(value) as T;
}

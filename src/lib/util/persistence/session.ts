export type SignInSource = "saveModal" | "loadModal" | "authPopup";

function parseSignInSource(value: string | null): SignInSource | null {
	return value === "saveModal" || value === "loadModal" || value === "authPopup"
		? value
		: null;
}

/** Persist before redirecting; let the caller show storage failures and keep the circuit open. */
export function storeSignInSession(
	storage: Pick<Storage, "setItem">,
	graph: unknown,
	source: SignInSource,
) {
	storage.setItem("currentCircuit", JSON.stringify(graph));
	storage.setItem("signInSource", source);
}

/** Storage access and malformed documents must not prevent editor initialization. */
export async function restoreSession(
	storage: Pick<Storage, "getItem" | "removeItem">,
	replaceDocument: (input: unknown) => Promise<unknown>,
) {
	let source: SignInSource | null = null;
	let restored = false;
	let error: string | null = null;
	try {
		const document = storage.getItem("currentCircuit");
		source = parseSignInSource(storage.getItem("signInSource"));
		// Consume even malformed data so it cannot break every subsequent visit.
		storage.removeItem("currentCircuit");
		storage.removeItem("signInSource");
		if (document !== null) {
			restored = (await replaceDocument(document)) !== false;
		}
	} catch (e) {
		console.log(e);
		error =
			"Could not restore your circuit from this browser session. You can load a saved circuit or start a new one.";
	}
	return { source, restored, error };
}

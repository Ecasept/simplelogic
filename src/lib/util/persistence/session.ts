/** Storage access and malformed documents must not prevent editor initialization. */
export async function restoreSession(
	storage: Pick<Storage, "getItem" | "removeItem">,
	replaceDocument: (input: unknown) => Promise<unknown>,
) {
	let source: string | null = null;
	let restored = false;
	let error: string | null = null;
	try {
		const document = storage.getItem("currentCircuit");
		source = storage.getItem("signInSource");
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

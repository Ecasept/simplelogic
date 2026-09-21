import { expect, it } from "vitest";
import { EditorViewModel } from "./editorViewModel.svelte";

it("keeps overlapping operations blocked until both settle, including failures", async () => {
	const editor = new EditorViewModel();
	let release!: () => void;
	const first = editor.blocking(
		() =>
			new Promise<void>((resolve) => {
				release = resolve;
			}),
	);
	await expect(
		editor.blocking(async () => {
			throw new Error("failure");
		}),
	).rejects.toThrow("failure");
	expect(editor.isBlocked).toBe(true);
	release();
	await first;
	expect(editor.isBlocked).toBe(false);
});

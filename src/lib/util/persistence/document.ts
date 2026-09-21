import type { EditorViewModel } from "../editor/editorViewModel.svelte";
import type { GraphManager } from "../graph/graph.svelte";
import { simController } from "../graph/simulation.svelte";
import type { InteractionController } from "../interaction/interaction.svelte";
import { ZGraphData } from "../shared/types";

/** Decode every external document before touching the active editor. */
export function decodeDocument(input: unknown) {
	return ZGraphData.parse(
		typeof input === "string" ? JSON.parse(input) : input,
	);
}

export function createDocumentActions(
	graph: GraphManager,
	editor: EditorViewModel,
	interaction: InteractionController,
) {
	let queue = Promise.resolve();

	async function replaceDocument(
		input: unknown,
		signal?: AbortSignal,
	): Promise<boolean> {
		const document = decodeDocument(input);
		if (signal?.aborted) return false;
		const previous = queue;
		const replacement = editor.blocking(async () => {
			interaction.cancel();
			await previous;
			if (!(await simController.clear(signal))) return false;
			if (signal?.aborted) return false;
			editor.resetDocumentState();
			graph.setGraphData(document);
			graph.notifyAll();
			return true;
		});
		queue = replacement.then(
			() => { },
			() => { },
		);
		return replacement;
	}

	async function clearDocument() {
		await replaceDocument({ components: {}, wires: {}, nextId: 0 });
	}

	return { replaceDocument, clearDocument };
}

export type DocumentActions = ReturnType<typeof createDocumentActions>;

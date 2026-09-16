import { isMatching, type P } from "ts-pattern";
import type { Pattern } from "ts-pattern/types";
import type { InteractionState } from "./interactionTypes";
import type { EditorState } from "./viewModels/editorViewModel.svelte";

/** Read-only composition for rendering and shortcut matching; it owns no state. */
export type EditorUiState = Readonly<
	EditorState &
		InteractionState & {
			isCanvasGesture: boolean;
			matches: typeof matches;
		}
>;

function matches<const T extends Pattern<EditorUiState>>(
	this: EditorUiState,
	pattern: T,
): this is EditorUiState & P.infer<T> {
	return isMatching(pattern)(this);
}

export function composeEditorUiState(
	editor: Readonly<EditorState>,
	interaction: Readonly<InteractionState>,
): EditorUiState {
	return {
		...editor,
		...interaction,
		isCanvasGesture: interaction.kind === "pan" || interaction.kind === "area",
		matches,
	};
}

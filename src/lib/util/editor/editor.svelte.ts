import { graphManager } from "../graph/graph.svelte";
import { editorViewModel } from "./editorViewModel.svelte";
import { canvasViewModel } from "../interaction/canvasViewModel";
import { circuitModalViewModel } from "../persistence/circuitModalViewModel";
import { createInteractionController } from "../interaction/interaction.svelte";
import { createGraphActions } from "./graphActions";
import { createClipboardActions } from "./clipboard";
import { createModeActions } from "./editorMode";
import { createPersistenceActions } from "../persistence/persistence";
import { composeEditorUiState } from "./editorUiState";

export {
	graphManager,
	editorViewModel,
	canvasViewModel,
	circuitModalViewModel,
};

// Application composition only. Owners receive dependencies and never import this module.
export const interactionController = createInteractionController({
	graphManager,
	editorViewModel,
	canvasViewModel,
});
export const graphActions = createGraphActions(
	graphManager,
	editorViewModel,
	interactionController,
);
export const clipboardActions = createClipboardActions(
	graphManager,
	editorViewModel,
	canvasViewModel,
	interactionController,
);
export const modeActions = createModeActions(
	editorViewModel,
	interactionController,
);
export const persistenceActions = createPersistenceActions(
	graphManager,
	editorViewModel,
	circuitModalViewModel,
	interactionController,
);

// A live, read-only projection. No independently writable interaction flags or edit states.
export const editorUiState = {
	get current() {
		return composeEditorUiState(
			editorViewModel.uiState,
			interactionController.state,
		);
	},
};

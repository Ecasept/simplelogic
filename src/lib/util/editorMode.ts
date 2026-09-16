import type { EditorViewModel } from "./viewModels/editorViewModel.svelte";
import type { InteractionController } from "./interaction.svelte";
import { simController } from "./simulation.svelte";

/** Coordinates mode changes with simulation and interaction teardown. */
export function createModeActions(
	editorViewModel: EditorViewModel,
	interactionController: InteractionController,
) {
	async function switchToDefaultMode() {
		await simController.stopLoop();
		interactionController.cancel();
		editorViewModel.setMode("edit");
	}

	async function switchToDeleteMode() {
		await simController.stopLoop();
		interactionController.cancel();
		editorViewModel.setMode("delete");
	}

	async function switchToSimulateMode() {
		interactionController.cancel();
		editorViewModel.setMode("simulate");
		simController.start();
	}
	async function toggleDelete() {
		if (editorViewModel.uiState.mode === "delete") {
			await switchToDefaultMode();
		} else {
			await switchToDeleteMode();
		}
	}
	async function toggleSimulate() {
		if (editorViewModel.uiState.mode === "simulate") {
			await switchToDefaultMode();
		} else {
			await switchToSimulateMode();
		}
	}

	return {
		switchToDefaultMode,
		switchToDeleteMode,
		switchToSimulateMode,
		toggleDelete,
		toggleSimulate,
	};
}

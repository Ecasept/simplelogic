import type { CircuitModalViewModel } from "./circuitModalViewModel.svelte";
import type { InteractionController } from "../interaction/interaction.svelte";
import type { DocumentActions } from "./document";

/** Opens persistence UI and replaces the active document after cancelling interactions. */
export function createPersistenceActions(
	circuitModalViewModel: CircuitModalViewModel,
	interactionController: InteractionController,
	documents: DocumentActions,
) {
	function saveGraph() {
		interactionController.cancel();
		circuitModalViewModel.openSave();
	}
	/** Opens the load modal in non-fresh mode (i.e. not onboarding). */
	function loadGraphManually() {
		loadGraph(false);
	}
	function loadGraph(isOnboarding: boolean) {
		interactionController.cancel();
		circuitModalViewModel.openLoad({
			isOnboarding,
			onLoad: ({ graph }, signal) => documents.replaceDocument(graph, signal),
		});
	}
	function closeModal() {
		circuitModalViewModel.close();
	}
	return {
		saveGraph,
		loadGraphManually,
		loadGraph,
		closeModal,
	};
}

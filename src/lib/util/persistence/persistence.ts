import type { GraphData } from "../shared/types";
import type { GraphManager } from "../graph/graph.svelte";
import type { EditorViewModel } from "../editor/editorViewModel.svelte";
import type { CircuitModalViewModel } from "./circuitModalViewModel";
import type { InteractionController } from "../interaction/interaction.svelte";
import { simController } from "../graph/simulation.svelte";

/** Opens persistence UI and replaces the active document after cancelling interactions. */
export function createPersistenceActions(
	graphManager: GraphManager,
	editorViewModel: EditorViewModel,
	circuitModalViewModel: CircuitModalViewModel,
	interactionController: InteractionController,
) {
	function saveGraph() {
		interactionController.cancel();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open("save", () => {});
	}
	/** Opens the load modal in non-fresh mode (i.e. not onboarding). */
	function loadGraphManually() {
		loadGraph(false);
	}
	function loadGraph(isOnboarding: boolean) {
		interactionController.cancel();
		editorViewModel.setModalOpen(true);
		circuitModalViewModel.open(
			"load",
			(newGraphData, type) => {
				setNewGraph(newGraphData);
				if (isOnboarding && type === "preset") {
					// If the user is new and selected a preset,
					// show him the circuit immediately for better onboarding
					closeModal();
				}
			},
			{ isOnboarding },
		);
	}
	function closeModal() {
		circuitModalViewModel.close();
		editorViewModel.setModalOpen(false);
	}
	function setNewGraph(newGraphData: GraphData) {
		interactionController.cancel();
		editorViewModel.hardReset();
		simController.reset();
		graphManager.clear();
		graphManager.setGraphData(newGraphData);
		graphManager.notifyAll();
	}

	return { saveGraph, loadGraphManually, loadGraph, closeModal, setNewGraph };
}

<script lang="ts">
	import {
		circuitModalViewModel,
		PersistenceAction,
	} from "$lib/util/actions.svelte";
	import type { CircuitModalUiState } from "$lib/util/viewModels/circuitModalViewModel";
	import { Download, Save } from "lucide-svelte";
	import BaseModal from "./BaseModal.svelte";
	import LoadModal from "./LoadModal.svelte";
	import SaveModal from "./SaveModal.svelte";

	let { uiState }: { uiState: CircuitModalUiState } = $props();

	function close() {
		PersistenceAction.closeModal();
	}

	function chooseGraph(id: number) {
		circuitModalViewModel.loadCircuit(id);
	}
</script>

{#if uiState.mode === "save"}
	<BaseModal title="Save your circuit" onClose={close}>
		{#snippet icon()}
			<Save size="28" />
		{/snippet}

		<SaveModal message={uiState.message} />
	</BaseModal>
{:else if uiState.mode === "load"}
	<BaseModal
		title={uiState.loadMode === "select"
			? "Load a circuit"
			: "Select a saved circuit"}
		onClose={close}
	>
		{#snippet icon()}
			<Download size="28" />
		{/snippet}

		<LoadModal
			loadMode={uiState.loadMode}
			listRequestData={uiState.listRequestData}
			message={uiState.message}
			onSelect={chooseGraph}
		/>
	</BaseModal>
{/if}

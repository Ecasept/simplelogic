<script lang="ts">
	import {
		circuitModalViewModel,
		persistenceActions,
	} from "$lib/util/editor/editor.svelte";
	import {
		feedbackFor,
		type CircuitModalUiState,
	} from "$lib/util/persistence/circuitModalViewModel";
	import { Download, Save } from "lucide-svelte";
	import BaseModal from "./BaseModal.svelte";
	import LoadModal from "./LoadModal.svelte";
	import SaveModal from "./SaveModal.svelte";

	let { uiState }: { uiState: CircuitModalUiState } = $props();

	function close() {
		persistenceActions.closeModal();
	}

	function chooseGraph(id: number) {
		circuitModalViewModel.loadCircuit(id);
	}
</script>

{#key uiState.openingId}
	{#if uiState.mode === "save"}
		<BaseModal title="Save your circuit" onClose={close}>
			{#snippet icon()}
				<Save size="28" />
			{/snippet}

			<SaveModal message={feedbackFor(uiState)} />
		</BaseModal>
	{:else if uiState.mode === "load"}
		<BaseModal
			title={uiState.screen.type === "circuit-list"
				? "Select a saved circuit"
				: "Load a circuit"}
			onClose={close}
		>
			{#snippet icon()}
				<Download size="28" />
			{/snippet}

			<LoadModal
				screen={uiState.screen}
				isOnboarding={uiState.isOnboarding}
				fixConnections={uiState.fixConnections}
				message={feedbackFor(uiState)}
				onSelect={chooseGraph}
			/>
		</BaseModal>
	{/if}
{/key}

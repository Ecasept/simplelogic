<script lang="ts">
	import type { FileModalUiState } from "$lib/util/viewModels/fileModalViewModel";
	import {
		fileModalViewModel,
		PersistenceAction,
	} from "$lib/util/viewModels/actions";

	let name = "";

	export let uiState: FileModalUiState;

	function saveGraph() {
		fileModalViewModel.saveGraph(name);
	}

	function loadGraph() {
		fileModalViewModel.loadGraph(name);
	}

	function close() {
		PersistenceAction.closeModal();
	}
</script>

<div class="background">
	<div class="modal-bg">
		{#if uiState.mode === "save"}
			<input type="text" bind:value={name} />
			<button on:click={saveGraph}>Save</button>
			{#if uiState.message !== null}
				<span>{uiState.message}</span>
			{/if}
		{/if}
		{#if uiState.mode === "load"}
			<input type="text" bind:value={name} />
			<button on:click={loadGraph}>Load</button>
			{#if uiState.message !== null}
				<span>{uiState.message}</span>
			{/if}
		{/if}
		<button on:click={close}>x</button>
	</div>
</div>

<style>
	.background {
		width: 100%;
		height: 100%;
		background-color: #000000a0;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.modal-bg {
		height: 50%;
		width: 50%;
		margin: auto;
		background-color: white;
		border-radius: 50px;
		padding: 50px;
	}
</style>

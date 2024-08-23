<script lang="ts">
	import type { FileModalUiState } from "$lib/util/viewModels/fileModalViewModel";
	import { fileModalViewModel, PersistenceAction } from "$lib/util/actions";

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
	function chooseGraph(id: number) {
		fileModalViewModel.loadGraph(id);
	}
</script>

<div class="background">
	<div class="modal-bg">
		{#if uiState.mode === "save"}
			<input type="text" bind:value={name} />
			<button on:click={saveGraph}>Save</button>
			{#if uiState.errorMessage !== null}
				<span>{uiState.errorMessage}</span>
			{/if}
		{/if}
		{#if uiState.mode === "load"}
			Select a saved graph
			<div class="list-container">
				{#if uiState.listRequestData !== null}
					{#each uiState.listRequestData.graphs as graphInfo (graphInfo.id)}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div on:click={(e) => chooseGraph(graphInfo.id)} class="graph-item">
							{graphInfo.name}
							<br />
							<span style="color: brown;">id: {graphInfo.id}</span>
						</div>
					{/each}
				{:else}
					Loading...
				{/if}
			</div>
			{#if uiState.errorMessage !== null}
				<span>{uiState.errorMessage}</span>
			{/if}
		{/if}
		<button class="close-button" on:click={close}>x</button>
	</div>
</div>

<style lang="scss">
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
		width: 50%;
		margin: auto;
		background-color: white;
		border-radius: 50px;
		padding: 50px;
		max-height: 50%;
	}

	.list-container {
		width: 80%;
		max-height: 80%;
		border: 2px solid gray;
		border-radius: 25px;
		overflow-x: hidden;
		overflow-y: scroll;
	}

	.graph-item {
		padding: 10px;
		width: 100%;
		&:hover {
			background-color: gray;
		}
	}
</style>

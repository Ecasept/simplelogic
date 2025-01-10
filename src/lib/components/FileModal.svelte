<script lang="ts">
	import type { FileModalUiState } from "$lib/util/viewModels/fileModalViewModel";
	import { fileModalViewModel, PersistenceAction } from "$lib/util/actions";
	import { X, Save, Download } from "lucide-svelte";
	import { onEnter } from "$lib/util/keyboard";

	let enteredName = $state("");

	let { uiState }: { uiState: FileModalUiState } = $props();

	function saveGraph() {
		fileModalViewModel.saveGraph(enteredName);
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
			<div id="modal-header">
				<div id="title-container">
					<Save size="32"></Save>
					<h2>Save your circuit</h2>
				</div>
				<button title="Close" class="close-button" onclick={close}
					><X></X></button
				>
			</div>
			<div id="entry">
				<input
					id="name-input"
					placeholder="Name"
					type="text"
					bind:value={enteredName}
				/>
				<button id="save-btn" onclick={saveGraph}>Save</button>
			</div>
			{#if uiState.errorMessage !== null}
				<span id="error-msg">{uiState.errorMessage}</span>
			{/if}
		{/if}

		{#if uiState.mode === "load"}
			<div id="modal-header">
				<div id="title-container">
					<Download size="32"></Download>
					<h2>Select a saved circuit</h2>
				</div>
				<button title="Close" class="close-button" onclick={close}
					><X></X></button
				>
			</div>
			<div class="list-container">
				{#if uiState.listRequestData !== null}
					{#each uiState.listRequestData.graphs as graphInfo (graphInfo.id)}
						<div
							role="menuitem"
							tabindex="0"
							onclick={(_) => chooseGraph(graphInfo.id)}
							onkeypress={onEnter((_) => chooseGraph(graphInfo.id))}
							class="graph-item"
						>
							{graphInfo.name}
							<br />
							<span style="color: brown;">id: {graphInfo.id}</span>
						</div>
					{/each}
				{:else}
					<span id="loading-span">Loading...</span>
				{/if}
			</div>
			{#if uiState.errorMessage !== null}
				<span id="error-msg">{uiState.errorMessage}</span>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	#title-container {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		h2 {
			margin: 0;
		}
	}
	#entry {
		display: flex;
	}
	#name-input {
		display: inline;

		width: 100%;

		padding: 10px;

		background-color: var(--light-color);
		border: 1px solid black;
		border-radius: 8px;
	}
	#save-btn {
		display: inline;
		background-color: var(--light-color);
		color: black;
		border: 1px solid black;
		cursor: pointer;
		border-radius: 12px;
		margin: 0px 5px;
		padding: 8px;

		&:hover {
			background-color: var(--light-darker-color);
		}
	}

	#modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	#modal-header .close-button {
		background-color: transparent;
		border: none;
		cursor: pointer;
		align-self: flex-start;
	}
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
		background-color: var(--bg-color);
		border-radius: 32px;
		padding: 30px;
		max-height: 50vh;
		display: flex;
		flex-direction: column;
	}

	.list-container {
		flex: 1;
		overflow-y: auto;
		margin: auto;
		width: 80%;
		border: 2px solid black;
		border-radius: 25px;
		overflow-x: hidden;
		overflow-y: auto;

		display: flex;
		flex-direction: column;

		background-color: var(--light-color);
	}

	.graph-item {
		padding: 10px;
		width: calc(100% - 20px);
		&:hover {
			background-color: #00000020;
			cursor: pointer;
		}
	}

	#loading-span {
		margin: 10px auto;
	}

	#error-msg {
		margin: 10px auto 0 auto;
		color: red;
	}
</style>

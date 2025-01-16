<script lang="ts">
	import { fileModalViewModel, PersistenceAction } from "$lib/util/actions";
	import type { FileModalUiState } from "$lib/util/viewModels/fileModalViewModel";
	import { Download, Save, X } from "lucide-svelte";
	import Button from "./Button.svelte";
	import CircuitList from "./CircuitList.svelte";

	let enteredName = $state("");

	let { uiState }: { uiState: FileModalUiState } = $props();

	function saveGraph() {
		fileModalViewModel.saveCircuit(enteredName);
	}

	function close() {
		PersistenceAction.closeModal();
	}
	function chooseGraph(id: number) {
		fileModalViewModel.loadCircuit(id);
	}
</script>

<div class="background">
	<div class="modal-bg">
		{#if uiState.mode === "save"}
			<div id="modal-header">
				<div id="title-container">
					<Save size="32" />
					<h2>Save your circuit</h2>
				</div>
				<button title="Close" class="close-button" onclick={close}>
					<X />
				</button>
			</div>
			<div id="entry">
				<input
					id="name-input"
					placeholder="Name"
					type="text"
					bind:value={enteredName}
				/>
				<Button text="Save" onClick={saveGraph} margin="0px" height="2.5em" />
			</div>
			{#if uiState.errorMessage !== null}
				<span id="error-msg">{uiState.errorMessage}</span>
			{/if}
		{/if}

		{#if uiState.mode === "load"}
			<div id="modal-header">
				<div id="title-container">
					<Download size="32" />
					<h2>Select a saved circuit</h2>
				</div>
				<button title="Close" class="close-button" onclick={close}>
					<X></X>
				</button>
			</div>
			<CircuitList listData={uiState.listRequestData} onSelect={chooseGraph} />
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
		gap: 10px;
		align-items: center;
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

	#error-msg {
		margin: 10px auto 0 auto;
		color: red;
	}
</style>

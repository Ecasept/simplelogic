<script lang="ts">
	import { circuitModalViewModel, PersistenceAction } from "$lib/util/actions";
	import type { CircuitModalUiState } from "$lib/util/viewModels/circuitModalViewModel";
	import { Download, Save, X } from "lucide-svelte";
	import Button from "../reusable/Button.svelte";
	import CircuitList from "./CircuitList.svelte";
	import HrText from "../reusable/HRText.svelte";

	let enteredName = $state("");

	let { uiState }: { uiState: CircuitModalUiState } = $props();

	function saveGraph() {
		circuitModalViewModel.saveCircuit(enteredName);
	}
	function copyCircuitToClipboard() {
		circuitModalViewModel.copyCircuitToClipboard();
	}
	function pasteCircuitFromClipboard() {
		circuitModalViewModel.pasteCircuitFromClipboard();
	}
	function loadCircuitList() {
		circuitModalViewModel.loadCircuitList(1);
	}
	function close() {
		PersistenceAction.closeModal();
	}
	function chooseGraph(id: number) {
		circuitModalViewModel.loadCircuit(id);
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
				<button title="Close" aria-label="Close" class="close-button" onclick={close}>
					<X />
				</button>
			</div>
			<Button
				text="Copy to clipboard"
				onClick={copyCircuitToClipboard}
				margin="0px"
				height="2.5em"
			/>
			<HrText text="or" margin="10px 5px" />
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
					<h2>
						{#if uiState.loadMode === "select"}
							Load a circuit
						{:else}
							Select a saved circuit
						{/if}
					</h2>
				</div>
				<button title="Close" aria-label="Close" class="close-button" onclick={close}>
					<X></X>
				</button>
			</div>
			{#if uiState.loadMode === "select"}
				<Button
					text="Paste from clipboard"
					onClick={pasteCircuitFromClipboard}
				/>
				<HrText text="or" margin="10px 5px" />
				<Button text="Load from server" onClick={loadCircuitList} />
			{:else}
				<CircuitList
					listData={uiState.listRequestData}
					onSelect={chooseGraph}
				/>
			{/if}
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

		background-color: var(--primary-color);
		border: 1px solid var(--primary-border-color);
		color: var(--on-primary-color);
		border-radius: 8px;
	}

	#modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--on-surface-color);

		button {
			color: inherit; // passes color on to svg
		}
		.close-button {
			background-color: transparent;
			border: none;
			cursor: pointer;
			align-self: flex-start;
		}
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
		background-color: var(--surface-color);
		border-radius: 32px;
		padding: 30px;
		max-height: 50vh;
		display: flex;
		flex-direction: column;
	}

	#error-msg {
		margin: 10px auto 0 auto;
		color: var(--error-color);
	}
</style>

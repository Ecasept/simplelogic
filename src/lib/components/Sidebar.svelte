<script lang="ts">
	import {
		EditorAction,
		graphManager,
		PersistenceAction,
	} from "$lib/util/actions";
	import { simulation } from "$lib/util/simulation.svelte";
	import type { ComponentType } from "$lib/util/types";
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";
	import {
		Download,
		PanelRightClose,
		PanelRightOpen,
		Play,
		Save,
		Trash2,
		Undo,
	} from "lucide-svelte";
	import AuthentificationSection from "./AuthentificationSection.svelte";
	import Button from "./Button.svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import ThemeSwitcher from "./ThemeSwitcher.svelte";

	type Props = {
		uiState: SidebarUiState;
		editMode: string | null;
		simulating: boolean;
		deleting: boolean;
		disabled: boolean;
		cookieLoggedIn: boolean;
	};
	let {
		uiState,
		editMode,
		cookieLoggedIn,
		disabled,
		simulating,
		deleting,
	}: Props = $props();

	sidebarViewModel.setLoggedInState(cookieLoggedIn);

	function addComponent(type: ComponentType, e: MouseEvent) {
		EditorAction.addComponent(type, e);
	}

	function handleUndo() {
		EditorAction.undo();
	}
	function handleClear() {
		EditorAction.clear();
	}
	function saveGraph() {
		PersistenceAction.saveGraph();
	}
	function loadGraph() {
		PersistenceAction.loadGraph();
	}
	function toggleOpen() {
		sidebarViewModel.toggleOpen();
	}

	let isSimulationRunning = $derived(simulation.isSimulationRunning());
	let historyLength = $derived(graphManager.historyLength);
</script>

{#if !uiState.open}
	<div id="button-container">
		<Button --padding="6px" text="" onClick={toggleOpen}>
			{#snippet icon()}<PanelRightOpen size="24px" />{/snippet}
		</Button>
	</div>
{/if}
<div class={{ disabled, sidebarWrapper: true }} class:open={uiState.open}>
	<div class="content">
		<div id="heading-container">
			<Button --padding="6px" text="" onClick={toggleOpen}>
				{#snippet icon()}<PanelRightClose size="24px" />{/snippet}
			</Button>
			<h2 style="margin:0;">Tools</h2>
			<ThemeSwitcher />
		</div>

		<ComponentToolbar {simulating} onClick={addComponent} />

		<hr />

		<div class="actions">
			<Button text="Save" onClick={saveGraph}>
				{#snippet icon()}<Save />{/snippet}
			</Button>
			<Button text="Load" onClick={loadGraph}>
				{#snippet icon()}<Download />{/snippet}
			</Button>
			<Button
				disabled={simulating || historyLength < 1}
				text="Undo"
				onClick={handleUndo}
			>
				{#snippet icon()}<Undo />{/snippet}
			</Button>
			<Button text="Clear" onClick={handleClear}>
				{#snippet icon()}<Trash2 />{/snippet}
			</Button>
		</div>

		<hr />

		<div>
			<div class="editingmode">
				Editing Mode:
				{#if editMode === "add"}
					Add
				{:else if editMode === "move"}
					Move
				{:else if deleting}
					Delete
				{:else if simulating}
					Simulate
				{:else if editMode === "pan"}
					Pan
				{:else}
					Normal
				{/if}
				{#if simulating}
					<br />
					Is simulation running: {isSimulationRunning}
				{/if}
			</div>
			<Button text="Toggle Delete" onClick={EditorAction.toggleDelete}>
				{#snippet icon()}<Trash2 />{/snippet}
			</Button>
			<Button text="Toggle Simulation" onClick={EditorAction.toggleSimulate}>
				{#snippet icon()}<Play />{/snippet}
			</Button>
		</div>

		<div id="space"></div>

		<AuthentificationSection {uiState} />
	</div>
</div>

<style lang="scss">
	#button-container {
		position: absolute;
		top: 10px;
		right: 10px;
	}
	.sidebarWrapper {
		color: var(--on-surface-color);
		position: absolute;
		width: 20vw;
		height: 100%;
		right: 0;
		top: 0;
		background-color: var(--surface-color);
		transition:
			translate 0.3s ease-in-out,
			opacity 0.3s;
		display: flex;
		overflow-y: scroll;

		/** Disable sidebar */
		&.disabled {
			pointer-events: none;
			opacity: 0;
		}

		/** Close sidebar */
		&:not(.open) {
			translate: 100%;
		}

		#heading-container {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 10px;
			margin-top: 10px;
		}
		.content {
			display: flex;
			flex-direction: column;
			padding: 10px;
			box-sizing: border-box;
		}
		#space {
			flex-grow: 1;
		}

		hr {
			border: 1px solid var(--on-surface-color);
			margin: 20px 0;
		}

		.actions {
			display: flex;
			justify-content: space-around;
			flex-wrap: wrap;
		}

		.editingmode {
			margin: 5px;
		}
	}
</style>

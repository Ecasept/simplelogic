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
	import { Download, Play, Save, Trash2, Undo } from "lucide-svelte";
	import AuthentificationSection from "./AuthentificationSection.svelte";
	import Button from "./Button.svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import ThemeSwitcher from "./ThemeSwitcher.svelte";

	type Props = {
		uiState: SidebarUiState;
		editMode: string | null;
		disabled: boolean;
		cookieLoggedIn: boolean;
	};
	let { uiState, editMode, cookieLoggedIn, disabled }: Props = $props();

	sidebarViewModel.setLoggedInState(cookieLoggedIn);

	let simulating = $derived(editMode === "simulate");

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

<div class={{ disabled, sidebarWrapper: true }} class:open={uiState.open}>
	<button class="collapse" onclick={toggleOpen}><span>▶</span></button>
	<div class="content">
		<div id="heading-container">
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
				{:else if editMode === "delete"}
					Delete
				{:else if editMode === "simulate"}
					Simulate
				{:else if editMode === "pan"}
					Pan
				{:else}
					Normal
				{/if}
				{#if editMode === "simulate"}
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
	.sidebarWrapper {
		color: var(--on-surface-color);
		position: absolute;
		width: 20vw;
		height: 100%;
		right: 0;
		top: 0;
		background-color: var(--surface-color);
		transition: translate 0.3s ease-in-out;
		display: flex;
		overflow-y: scroll;
		transition: opacity 0.3s;

		&.disabled {
			pointer-events: none;
			opacity: 0;
		}

		&:not(.open) {
			translate: 95%;

			.collapse > span {
				transform: rotate(180deg);
			}
		}

		#heading-container {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 10px;
			margin-top: 10px;
		}

		.collapse {
			bottom: 0;
			height: 100%;
			width: 5%;
			padding: 0;
			border: unset;
			background-color: var(--sidebar-collapse-color);
			cursor: pointer;

			span {
				color: black;
				display: block;
				transition: transform 0.3s;
			}
		}
		.content {
			display: flex;
			flex-direction: column;
			padding: 10px;
			width: 95%;
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

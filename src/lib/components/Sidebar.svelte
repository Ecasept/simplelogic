<script lang="ts">
	import { EditorAction, PersistenceAction } from "$lib/util/actions";
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";
	import { Download, Play, Save, Trash2, Undo } from "lucide-svelte";
	import AuthentificationSection from "./AuthentificationSection.svelte";
	import Button from "./Button.svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import type { ComponentType } from "$lib/util/types";

	type Props = {
		uiState: SidebarUiState;
		editType: string | null;
		cookieLoggedIn: boolean;
	};
	let { uiState, editType, cookieLoggedIn }: Props = $props();

	sidebarViewModel.setLoggedInState(cookieLoggedIn);

	let simulating = $derived(editType === "simulate");

	function addComponent(type: ComponentType, e: MouseEvent) {
		EditorAction.addComponent(type, e);
	}

	function handleUndo() {
		EditorAction.undo();
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
</script>

<div class="sidebarWrapper" class:open={uiState.open}>
	<button class="collapse" onclick={toggleOpen}><span>▶</span></button>
	<div class="content">
		<h2>Tools</h2>
		<ComponentToolbar {simulating} onClick={addComponent} />

		<hr />

		<div class="actions">
			<Button disabled={simulating} text="Save" onClick={saveGraph}>
				{#snippet icon()}<Save />{/snippet}
			</Button>
			<Button disabled={simulating} text="Load" onClick={loadGraph}>
				{#snippet icon()}<Download />{/snippet}
			</Button>
			<Button disabled={simulating} text="Undo" onClick={handleUndo}>
				{#snippet icon()}<Undo />{/snippet}
			</Button>
		</div>

		<hr />

		<div>
			<div class="editingmode">
				Editing Mode:
				{#if editType === "add"}
					Add
				{:else if editType === "move"}
					Move
				{:else if editType === "delete"}
					Delete
				{:else if editType === "simulate"}
					Simulate
				{:else}
					Normal
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
		color: black;
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: var(--bg-color);
		transition: left 0.3s ease-in-out;
		left: 80vw;
		display: flex;

		&:not(.open) {
			left: 99vw;

			.collapse > span {
				transform: rotate(180deg);
			}
		}

		.collapse {
			bottom: 0;
			height: 100%;
			width: 1vw;
			padding: 0;
			border: unset;
			background-color: rgb(81, 124, 72);
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
			width: 100%;
		}
		#space {
			flex-grow: 1;
		}

		hr {
			border: 1px solid black;
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

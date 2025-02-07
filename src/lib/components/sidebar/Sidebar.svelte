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
		Save,
		Trash2,
		Undo,
	} from "lucide-svelte";
	import Button from "../reusable/Button.svelte";
	import AuthentificationSection from "./AuthentificationSection.svelte";
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
		<Button title="Open Sidebar" --padding="6px" text="" onClick={toggleOpen}>
			{#snippet icon()}<PanelRightOpen size="24px" />{/snippet}
		</Button>
	</div>
{/if}
<div class={{ disabled, sidebarWrapper: true, open: uiState.open }}>
	<div class="content">
		<div id="heading-container">
			<div id="inside-button-container">
				<Button
					title="Close Sidebar"
					--padding="6px"
					text=""
					onClick={toggleOpen}
				>
					{#snippet icon()}<PanelRightClose size="24px" />{/snippet}
				</Button>
			</div>
			<h2 style="margin:0;">Tools</h2>
			<ThemeSwitcher />
		</div>

		<div id="fixed-margin"></div>

		<ComponentToolbar onPointerDown={addComponent} />

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

		<div id="space"></div>

		<AuthentificationSection {uiState} />
	</div>
</div>

<style lang="scss">
	@use "src/lib/css/variables.scss" as *;
	@media (min-width: $mobile-breakpoint) {
		.sidebarWrapper {
			width: 25vw;
			height: 100%;
			right: 0;
			top: 0;
			/** Close the sidebar by moving it 100% of its width to the right */
			&:not(.open) {
				translate: 100%;
			}
		}
		/** Place the button at the top-right */
		#button-container {
			top: 10px;
			right: 10px;
		}
		#heading-container {
			margin-bottom: 10px;
			margin-top: 10px;
		}
	}
	/** If the screen isn't wide enough, put the sidebar at the bottom */
	@media (max-width: $mobile-breakpoint) {
		.sidebarWrapper {
			width: 100%;
			max-height: 50vh;
			bottom: 0;
			left: 0;
			/** Close it by shifting it 100% on the y-axis*/
			&:not(.open) {
				translate: 0 100%;
			}
		}
		/* Place the button at the bottom-left
		and rotate it 90 degrees to make the icon match the vbertical sidebar */
		#button-container {
			right: 10px;
			bottom: 10px;
			transform: rotate(90deg);
		}
		#inside-button-container {
			transform: rotate(90deg);
		}
		#heading-container {
			position: fixed;
			// The heading needs to cover the content without any margin at the edges
			// However we also don't want the heading to be at the very edge of the screen
			// So we cancel out the padding with negative margins (to remove any holes at the edges)
			// and add padding to the inside of the heading (so the heading doesn't touch the edge)
			margin-top: -10px;
			margin-left: -10px;
			padding-top: 10px;
			padding-left: 10px;
			// The heading should be as wide as the sidebar - 20px (padding)
			width: calc(100% - 20px);
			background-color: var(--surface-color);

			// Put sidebar button to the right so that
			// people holding their phone with their right hand can easily reach it
			// (sorry left-handed people)
			flex-direction: row-reverse;
		}
		#fixed-margin {
			min-height: 70px;
		}
	}

	#button-container {
		position: absolute;
	}
	.sidebarWrapper {
		color: var(--on-surface-color);
		position: absolute;
		background-color: var(--surface-color);
		display: flex;
		overflow-y: scroll;
		transition:
			translate 0.3s ease-in-out,
			opacity 0.3s;

		/** Disable sidebar */
		&.disabled {
			pointer-events: none;
			opacity: 0;
		}

		#heading-container {
			display: flex;
			justify-content: space-between;
			align-items: center;
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
			border: 1px solid var(--on-surface-color);
			margin: 20px 0;
		}

		.actions {
			display: flex;
			justify-content: space-around;
			flex-wrap: wrap;
		}
	}
</style>

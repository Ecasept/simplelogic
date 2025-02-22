<script>
	import { ChangesAction } from "$lib/util/actions";
	import CancelButton from "../CancelButton.svelte";
	import SelectionSidebar from "./sidebars/SelectionSidebar.svelte";
	import ToolsSidebar from "./sidebars/ToolsSidebar.svelte";
	import Toolbar from "./Toolbar.svelte";

	let { uiState } = $props();

	let addingComponent = $derived(
		uiState.matches({
			editType: "addingComponent",
		}),
	);
</script>

<div id="on-canvas-container" class="nointeract">
	<Toolbar {uiState} simulating={uiState.matches({ mode: "simulate" })} />
	<div class="sidebar-area nointeract">
		<ToolsSidebar {uiState} />
		<div class={["cancel-button nointeract", { show: addingComponent }]}>
			<CancelButton
				shouldShow={addingComponent}
				cancel={ChangesAction.abortEditing}
			/>
		</div>
		<SelectionSidebar {uiState} />
	</div>
</div>

<style lang="scss">
	@use "src/lib/css/variables.scss" as *;
	#on-canvas-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	/* Disable `.nointeract`s but make sure that the children of the container that can't be interacted with
	can still be interacted with */
	.nointeract {
		pointer-events: none;
	}
	:global(.nointeract > *) {
		pointer-events: auto;
	}

	.sidebar-area {
		$margin: 20px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;

		width: calc(100% - 2 * $margin);
		margin: 0px $margin;

		gap: 10px;
	}

	:global(.sidebar-area > :first-child) {
		justify-self: start;
		// don't fill the whole height
		align-self: start;
	}
	:global(.sidebar-area > :last-child) {
		justify-self: end;
		// don't fill the whole height
		align-self: start;
	}

	@media (max-width: $mobile-breakpoint) {
		#on-canvas-container {
			flex-direction: column-reverse;
			bottom: 0;
		}
		// Make grid vertical
		.sidebar-area {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto;
			width: auto;
		}
		// Center the sidebars
		:global(.sidebar-area > :first-child) {
			justify-self: center;
		}
		:global(.sidebar-area > :last-child) {
			justify-self: center;
		}
		:global(.cancel-button) {
			// Move cancel button to the top
			grid-row: 1;
			// Center it
			justify-self: center;
		}
	}
</style>

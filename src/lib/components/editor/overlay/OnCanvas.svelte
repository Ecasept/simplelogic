<script lang="ts">
	import { ChangesAction } from "$lib/util/actions";
	import type { AuthUiState } from "$lib/util/viewModels/authViewModel";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import CancelButton from "../CancelButton.svelte";
	import AccountButton from "./account/AccountButton.svelte";
	import Logo from "./Logo.svelte";
	import SelectionSidebar from "./sidebars/SelectionSidebar.svelte";
	import ToolsSidebar from "./sidebars/ToolsSidebar.svelte";
	import Toolbar from "./Toolbar.svelte";

	type Props = {
		uiState: EditorUiState;
		authUiState: AuthUiState;
	};

	let { uiState, authUiState }: Props = $props();

	let addingComponent = $derived(
		uiState.matches({
			editType: "addingComponent",
		}),
	);
</script>

<div id="on-canvas-container" class="nointeract">
	<div class="toolbar-area nointeract">
		<Logo />
		<Toolbar {uiState} simulating={uiState.matches({ mode: "simulate" })} />
		<AccountButton uiState={authUiState} />
	</div>
	<div class="sidebar-area nointeract">
		<ToolsSidebar {uiState} />
		<div class="cancel-button nointeract">
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
		padding: 10px;
		box-sizing: border-box;
		gap: 10px;

		display: flex;
		flex-direction: column;
		align-items: center;
	}
	/* Disable `.nointeract`s but make sure that the children of the container that can't be interacted with
	can still be interacted with */
	.nointeract {
		pointer-events: none;
	}
	.nointeract > :global(*:not(.nointeract)) {
		pointer-events: auto;
	}

	.toolbar-area {
		display: grid;
		grid-template-columns: 1fr auto 1fr;

		justify-items: center;
		align-items: center;

		width: 100%;

		gap: 10px;

		& > :global(:first-child) {
			justify-self: start;
		}
		& > :global(:last-child) {
			justify-self: end;
		}
	}

	.sidebar-area {
		display: grid;
		grid-template-columns: 1fr auto 1fr;

		width: 100%;

		gap: 10px;

		// items don't fill the whole height
		align-items: start;

		& > :global(:first-child) {
			justify-self: start;
		}
		& > :global(:last-child) {
			justify-self: end;
		}
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

			& > :global(:first-child) {
				justify-self: center;
			}
			& > :global(:last-child) {
				justify-self: center;
			}
		}
		.cancel-button {
			// Move cancel button to the top
			grid-row: 1;
			// Center it
			justify-self: center;
		}
	}
</style>

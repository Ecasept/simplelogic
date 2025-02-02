<script lang="ts">
	import AddingAlert from "$lib/components/AddingAlert.svelte";
	import Canvas from "$lib/components/Canvas.svelte";
	import CircuitModal from "$lib/components/CircuitModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import {
		canvasViewModel,
		ChangesAction,
		circuitModalViewModel,
		EditorAction,
		editorViewModel,
	} from "$lib/util/actions";
	import { mousePosition, setMousePosition } from "$lib/util/global";
	import { handleKeyDown } from "$lib/util/keyboard";
	import { cancelLongPressIfMoved } from "$lib/util/longpress";
	import { getThemeClass } from "$lib/util/theme.svelte";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";

	let { data }: { data: import("./$types").LayoutData } = $props();
	let themeClass = $derived.by(getThemeClass);

	function updatePosition(e: PointerEvent) {
		const pos = { x: e.clientX, y: e.clientY };
		setMousePosition(pos);

		const uiState = editorViewModel.uiState;
		const editMode = uiState.editMode;
		if (editMode === "move" || editMode === "add") {
			if (uiState.draggedWire === null) {
				EditorAction.moveComponentReplaceable(pos, uiState.editedId);
			} else {
				EditorAction.moveWireConnectionReplaceable(
					pos,
					uiState.draggedWire.id,
					uiState.draggedWire.handleType,
				);
			}
		}
	}

	function onPointerMove(e: PointerEvent) {
		updatePosition(e);
		cancelLongPressIfMoved(mousePosition);
	}

	function onPointerUp(e: PointerEvent) {
		// on touch screens, no pointer move events are emitted for adding components
		// so we need to update the position here
		updatePosition(e);

		cancelLongPressIfMoved(mousePosition);

		const uiState = editorViewModel.uiState;
		const editMode = uiState.editMode;

		if (!(editMode === "move" || editMode === "add")) {
			// don't do anything if nothing is being edited
			return;
		}

		if (uiState.draggedWire != null && uiState.hoveredHandle != null) {
			// A wire is being dragged, and it is hovering over a handle
			// -> connect the wire to the handle
			EditorAction.connect(
				{
					id: uiState.draggedWire.id,
					handleType: uiState.draggedWire.handleType,
				},
				// uiState is a rune, so we need to snapshot it
				$state.snapshot(uiState.hoveredHandle),
			);
		}

		// commit the changes that were made while dragging
		ChangesAction.commitChanges();
	}

	let addingComponent = $derived(
		editorViewModel.uiState.editMode === "add" &&
			editorViewModel.uiState.editedId != null,
	);
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<!-- Show an alert when user is adding a component -->
	<AddingAlert
		shouldShow={addingComponent}
		cancel={ChangesAction.abortEditing}
	/>
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar
		editMode={editorViewModel.uiState.editMode}
		cookieLoggedIn={data.loggedIn}
		uiState={$sidebarViewModel}
		disabled={addingComponent}
		simulating={editorViewModel.uiState.editMode === "simulate" ||
			editorViewModel.uiState.prevState?.editMode === "simulate"}
		deleting={editorViewModel.uiState.editMode === "delete" ||
			editorViewModel.uiState.prevState?.editMode === "delete"}
	></Sidebar>
	{#if $circuitModalViewModel.mode !== null}
		<CircuitModal uiState={$circuitModalViewModel}></CircuitModal>
	{/if}
</div>

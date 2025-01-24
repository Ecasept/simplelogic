<script lang="ts">
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import {
		canvasViewModel,
		ChangesAction,
		EditorAction,
		editorViewModel,
		fileModalViewModel,
	} from "$lib/util/actions";
	import { setMousePosition } from "$lib/util/global";
	import { handleKeyDown } from "$lib/util/keyboard";
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
	}

	function onPointerUp(e: PointerEvent) {
		// on touch screens, no pointer move events are emitted for adding components
		// so we need to update the position here
		updatePosition(e);

		const uiState = editorViewModel.uiState;
		const editMode = uiState.editMode;

		if (!(editMode === "move" || editMode === "add")) {
			// don't do anything if nothing is being edited
			return;
		}

		if (uiState.draggedWire != null && uiState.hoveredHandle != null) {
			// wire is being connected
			EditorAction.connect(
				{
					id: uiState.draggedWire.id,
					handleType: uiState.draggedWire.handleType,
				},
				uiState.hoveredHandle,
			);
		}

		// commit the changes that were made while dragging
		ChangesAction.commitChanges();
	}
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar
		editMode={$editorViewModel.editMode}
		cookieLoggedIn={data.loggedIn}
		uiState={$sidebarViewModel}
		disabled={$editorViewModel.editMode === "add" &&
			$editorViewModel.editedId != null}
	></Sidebar>
	{#if $fileModalViewModel.mode !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

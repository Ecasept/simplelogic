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
	import { isClickOverSidebar, setMousePosition } from "$lib/util/global";
	import { handleKeyDown } from "$lib/util/keyboard";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";

	let { data }: { data: import("./$types").LayoutData } = $props();

	function onMouseMove(e: MouseEvent) {
		const pos = { x: e.clientX, y: e.clientY };
		setMousePosition(pos);

		const editType = editorViewModel.uiState.editType;
		if (editType === "move" || editType === "add") {
			EditorAction.move(pos, editorViewModel.uiState.editedId);
		}
	}
	function onMouseUp(e: MouseEvent) {
		const uiState = editorViewModel.uiState;
		const editType = uiState.editType;

		if (!(editType === "move" || editType === "add")) {
			// don't do anything if nothing is being edited
			return;
		}
		if (editType === "add" && isClickOverSidebar(e)) {
			return;
		}

		if (
			editorViewModel.uiState.draggedHandle !== null &&
			editorViewModel.uiState.hoveredHandle !== null &&
			!editorViewModel.uiState.outputConnectedToWire
		) {
			// this means that a wire is being connected
			EditorAction.connect(
				{
					id: editorViewModel.uiState.editedId,
					handleType: editorViewModel.uiState.draggedHandle,
				},
				editorViewModel.uiState.hoveredHandle,
			);
		}

		// commit the changes that were made while dragging
		ChangesAction.commitChanges();
	}
</script>

<svelte:window
	onmousemove={onMouseMove}
	onmouseup={onMouseUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper">
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar
		editType={$editorViewModel.editType}
		cookieLoggedIn={data.loggedIn}
		uiState={$sidebarViewModel}
	></Sidebar>
	{#if $fileModalViewModel.mode !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

<script lang="ts">
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { isClickOverSidebar, setMousePosition } from "$lib/util/global";
	import {
		canvasViewModel,
		ChangesAction,
		EditorAction,
		editorViewModel,
		fileModalViewModel,
	} from "$lib/util/actions";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";
	import { handleKeyDown } from "$lib/util/keyboard";

	/** @type {import('./$types').LayoutData} */
	export let data;

	function onMouseMove(e: MouseEvent) {
		console.log(editorViewModel.uiState.editType);
		const pos = { x: e.clientX, y: e.clientY };
		setMousePosition(pos);
		if (
			editorViewModel.uiState.editType === null ||
			editorViewModel.uiState.editType === "delete"
		) {
			return;
		}
		EditorAction.move(pos, editorViewModel.uiState.editedId);
	}
	function onMouseUp(e: MouseEvent) {
		if (
			editorViewModel.uiState.editType === null ||
			editorViewModel.uiState.editType === "delete"
		) {
			return;
		}
		if (editorViewModel.uiState.editType === "add" && isClickOverSidebar(e)) {
			return;
		}
		if (
			editorViewModel.uiState.draggedHandle !== null &&
			editorViewModel.uiState.hoveredHandle !== null &&
			!editorViewModel.uiState.outputConnectedToWire
		) {
			EditorAction.connect(
				{
					id: editorViewModel.uiState.editedId,
					handleType: editorViewModel.uiState.draggedHandle,
				},
				editorViewModel.uiState.hoveredHandle,
			);
		}
		ChangesAction.commitChanges();
	}
</script>

<svelte:window
	on:mousemove={onMouseMove}
	on:mouseup={onMouseUp}
	on:keydown={handleKeyDown}
/>

<div class="wrapper">
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar loggedIn={data.loggedIn} uiState={$sidebarViewModel}></Sidebar>
	{#if $fileModalViewModel.mode !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

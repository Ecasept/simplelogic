<script lang="ts">
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { isClickOverSidebar } from "$lib/util/global";
	import {
		canvasViewModel,
		ChangesAction,
		EditorAction,
		editorViewModel,
		fileModalViewModel,
		PersistenceAction,
	} from "$lib/util/viewModels/actions";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";

	function onMouseMove(e: MouseEvent) {
		const pos = { x: e.clientX, y: e.clientY };
		if (editorViewModel.uiState.state === null) {
			return;
		}
		EditorAction.move(pos, editorViewModel.uiState.id);
	}
	function onMouseUp(e: MouseEvent) {
		if (editorViewModel.uiState.state === null) {
			return;
		}
		if (editorViewModel.uiState.state === "add" && isClickOverSidebar(e)) {
			return;
		}
		ChangesAction.commitChanges();
	}
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			if (editorViewModel.uiState.state !== null) {
				ChangesAction.discardChanges();
			} else if (editorViewModel.uiState.isModalOpen) {
				PersistenceAction.closeModal();
			}
		}
	}
</script>

<svelte:window
	on:mousemove={onMouseMove}
	on:mouseup={onMouseUp}
	on:keydown={onKeyDown}
/>

<div class="wrapper">
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar uiState={$sidebarViewModel}></Sidebar>
	{#if $fileModalViewModel.mode !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

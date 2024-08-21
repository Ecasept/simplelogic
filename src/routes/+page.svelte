<script>
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { fileModalViewModel } from "$lib/util/viewModels/fileModalViewModel";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";
</script>

<div class="wrapper">
	<Canvas></Canvas>
	<Sidebar uiState={$sidebarViewModel}></Sidebar>
	{#if $fileModalViewModel.state !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

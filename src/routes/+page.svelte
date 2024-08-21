<script>
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { fileModalViewModel } from "$lib/util/viewModels/fileModalViewModel";
</script>

<div class="wrapper">
	<Canvas></Canvas>
	<Sidebar></Sidebar>
	{#if $fileModalViewModel.state !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

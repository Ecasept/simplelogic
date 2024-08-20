<script>
	import Canvas from "$lib/components/Canvas.svelte";
	import FileModal from "$lib/components/FileModal.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { editorViewModel, fileModalViewModel } from "$lib/util/viewModels";
</script>

<div class="wrapper">
	<Canvas></Canvas>
	<Sidebar></Sidebar>
	{#if $fileModalViewModel.state !== null}
		<FileModal uiState={$fileModalViewModel}></FileModal>
	{/if}
</div>

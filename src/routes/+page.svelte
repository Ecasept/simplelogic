<script>
	import Canvas from '$lib/components/Canvas.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let canvas;
	let sidebar;
</script>

<div class="wrapper">
	<Canvas bind:this={canvas}></Canvas>
	<Sidebar bind:this={sidebar} {canvas}></Sidebar>
</div>

<style lang="scss">
	.wrapper {
	}
</style>
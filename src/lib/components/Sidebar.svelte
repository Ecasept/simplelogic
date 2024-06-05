<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import Canvas from '$lib/components/Canvas.svelte';

	export let canvas: Canvas;

	function addCmp() {
		canvas.addCmp("test")
	}
</script>

<div class="sidebarWrapper">
	<button on:click={addCmp}>Add Component</button>
</div>

<style lang="scss">
	.sidebarWrapper {
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: red;
	}
</style>
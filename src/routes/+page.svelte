<script>
	import Canvas from "$lib/components/Canvas.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";

	let canvas;
</script>

<div class="wrapper">
	<Canvas bind:this={canvas}></Canvas>
	<Sidebar on:componentAdd={canvas.addComponent}></Sidebar>
</div>

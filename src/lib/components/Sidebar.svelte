<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';

	export let canvas: Canvas;

	let open = true;

	function addCmp() {
		canvas.addCmp('test');
	}

	function collapse() {
		open = !open;
	}
</script>

<div class="sidebarWrapper" class:open={open}>
	<button class="collapse" on:click={collapse}>Collapse Sidebar</button>
	<div class="content">
		<button on:click={addCmp}>Add Component</button>
	</div>
</div>

<style lang="scss">
	.sidebarWrapper {
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: red;
		transition: left .3s ease-in-out;
		left: 80vw;
		display: flex;

		&:not(.open) {
			left: 99vw;
		}

		.collapse {
			bottom: 0;
			height: 100%;
			width: 1vw;
		}
	}
</style>
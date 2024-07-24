<script lang="ts">
	import Canvas from '$lib/components/Canvas.svelte';

	export let canvas: Canvas;

	let open = true;

	function addCmp(label: string, type: string) {
		canvas.addCmp(label, type);
	}

	function collapse() {
		open = !open;
	}
</script>

<div class="sidebarWrapper" class:open={open}>
	<button class="collapse" on:click={collapse}><span>▶</span></button>
	<div class="content">
		<button on:click={() => addCmp("test", "AND")}>Add AND</button>
		<button on:click={() => addCmp("test2", "OR")}>Add OR</button>
	</div>
</div>

<style lang="scss">
	.sidebarWrapper {
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: rgb(51, 51, 51);
		transition: left .3s ease-in-out;
		left: 80vw;
		display: flex;

		&:not(.open) {
			left: 99vw;

			.collapse > span {
				transform: rotate(180deg);
			}
		}

		.collapse {
			bottom: 0;
			height: 100%;
			width: 1vw;
			padding: 0;
			border: unset;
			background: rgba(255, 255, 255, 0.1);
			cursor: pointer;

			span {
				color: white;
				display: block;
				transition: transform .3s;
			}
		}
	}
</style>
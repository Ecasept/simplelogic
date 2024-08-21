<script lang="ts">
	import { COMPONENT_IO_MAPPING, GRID_SIZE } from "$lib/util/global";
	import { canvasViewModel } from "$lib/util/viewModels/canvasViewModel";
	import { editorViewModel } from "$lib/util/viewModels/editorViewModel";

	let open = true;

	function addComponent(label: string, type: string, e: MouseEvent) {
		const data = structuredClone(COMPONENT_IO_MAPPING[type]);
		const svgPos = canvasViewModel.clientToSVGCoords({
			x: e.clientX,
			y: e.clientY,
		});
		editorViewModel.addComponent({
			type: type,
			label: label,
			size: { x: data.width, y: data.height },
			position: {
				x: svgPos.x - (data.width * GRID_SIZE) / 2,
				y: svgPos.y - (data.height * GRID_SIZE) / 2,
			},
			handles: data.connections,
		});
	}

	function collapse() {
		open = !open;
	}

	function handleUndo() {
		editorViewModel.undo();
	}

	function saveGraph() {
		editorViewModel.saveGraph();
	}
	function loadGraph() {
		editorViewModel.loadGraph();
	}
</script>

<div class="sidebarWrapper" class:open>
	<button class="collapse" on:click={collapse}><span>▶</span></button>
	<div class="content">
		<button on:click={(e) => addComponent("test", "AND", e)}>Add AND</button>
		<button on:click={(e) => addComponent("test2", "OR", e)}>Add OR</button>
		<button on:click={saveGraph}>Save</button>
		<button on:click={loadGraph}>Load</button>
		<button on:click={handleUndo}>Undo</button>
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
		transition: left 0.3s ease-in-out;
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
				transition: transform 0.3s;
			}
		}
	}
</style>

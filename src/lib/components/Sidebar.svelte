<script lang="ts">
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";

	export let uiState: SidebarUiState;

	function addComponent(label: string, type: string, e: MouseEvent) {
		sidebarViewModel.addComponent(label, type, { x: e.clientX, y: e.clientY });
	}

	function handleUndo() {
		sidebarViewModel.undo();
	}

	function saveGraph() {
		sidebarViewModel.saveGraph();
	}
	function loadGraph() {
		sidebarViewModel.loadGraph();
	}
	function toggleOpen() {
		sidebarViewModel.toggleOpen();
	}
</script>

<div class="sidebarWrapper" class:open={uiState.open}>
	<button class="collapse" on:click={toggleOpen}><span>▶</span></button>
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

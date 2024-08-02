<script lang="ts">
	import { COMPONENT_IO_MAPPING, deepCopy, GRID_SIZE } from "$lib/util/global";
	import { viewModel } from "$lib/util/graph";
	import type { ComponentCreateEvent } from "$lib/util/types";
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher<{
		componentCreate: ComponentCreateEvent;
	}>();

	let open = true;

	function createComponent(label: string, type: string, e: MouseEvent) {
		const data = deepCopy(COMPONENT_IO_MAPPING[type]);

		dispatch("componentCreate", {
			type: type,
			label: label,
			size: { x: data.width, y: data.height },
			position: {
				x: e.clientX - (data.width * GRID_SIZE) / 2,
				y: e.clientY - (data.height * GRID_SIZE) / 2,
			},
			connections: data.connections,
		});
	}

	function collapse() {
		open = !open;
	}

	function handleUndo() {
		viewModel.undo();
	}
</script>

<div class="sidebarWrapper" class:open>
	<button class="collapse" on:click={collapse}><span>▶</span></button>
	<div class="content">
		<button on:click={(e) => createComponent("test", "AND", e)}>Add AND</button>
		<button on:click={(e) => createComponent("test2", "OR", e)}>Add OR</button>
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

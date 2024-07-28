<script lang="ts">
	import Canvas from "$lib/components/Canvas.svelte";
	import { COMPONENT_IO_MAPPING } from "$lib/util/global";
	import { undoLastCommand } from "$lib/util/graph";
	import type { AddComponentEvent } from "$lib/util/types";
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher<{ componentAdd: AddComponentEvent }>();

	let open = true;

	function addCmp(label: string, type: string) {
		const inputs = COMPONENT_IO_MAPPING[type].inputs;
		const outputs = COMPONENT_IO_MAPPING[type].outputs;
		let height = (inputs.left?.length || 0) + (outputs.left?.length || 0);
		height = Math.max(
			height,
			(inputs.right?.length || 0) + (outputs.right?.length || 0),
		);
		let width = (inputs.top?.length || 0) + (outputs.top?.length || 0);
		width = Math.max(
			width,
			(inputs.bottom?.length || 0) + (outputs.bottom?.length || 0),
		);

		dispatch("componentAdd", {
			type: type,
			label: label,
			size: { x: width + 1, y: height + 1 },
			position: { x: 400, y: 400 },
			inputs: inputs,
			outputs: outputs,
		});
	}

	function collapse() {
		open = !open;
	}
</script>

<div class="sidebarWrapper" class:open>
	<button class="collapse" on:click={collapse}><span>▶</span></button>
	<div class="content">
		<button on:click={() => addCmp("test", "AND")}>Add AND</button>
		<button on:click={() => addCmp("test2", "OR")}>Add OR</button>
		<button on:click={undoLastCommand}>Undo</button>
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

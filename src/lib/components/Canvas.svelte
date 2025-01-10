<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import Wire from "$lib/components/Wire.svelte";
	import { GRID_SIZE } from "$lib/util/global";
	import type { CanvasUiState } from "$lib/util/viewModels/canvasViewModel";
	import {
		canvasViewModel,
		editorViewModel,
		graphManager,
	} from "$lib/util/actions";

	let { uiState }: { uiState: CanvasUiState } = $props();

	let svg: SVGSVGElement;

	$effect(() => {
		// update the svg element in the canvas view model
		canvasViewModel.svg = svg;
	});

	function pan(e: MouseEvent) {
		canvasViewModel.pan(e.movementX, e.movementY);
	}
	function startPan() {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		canvasViewModel.startPan();
	}
	function endPan() {
		canvasViewModel.endPan();
	}
	function zoom(event: WheelEvent) {
		event.preventDefault();

		const factor = event.deltaY > 0 ? 1.1 : 0.9;

		canvasViewModel.zoom(factor, {
			x: event.clientX,
			y: event.clientY,
		});
	}
</script>

<div class="canvasWrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		role="application"
		onmousedown={startPan}
		onmousemove={pan}
		onmouseup={endPan}
		onmouseleave={endPan}
		onwheel={zoom}
		width="100vw"
		height="100vh"
		preserveAspectRatio="xMinYMin slice"
		xmlns="http://www.w3.org/2000/svg"
		stroke-width="2px"
		viewBox="{uiState.viewBox.x} {uiState.viewBox.y} {uiState.viewBox
			.width} {uiState.viewBox.height}"
	>
		<defs>
			<pattern
				id="dot-pattern"
				x="-1"
				y="-1"
				width={GRID_SIZE}
				height={GRID_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<circle cx="1" cy="1" r="1" fill="#999" />
			</pattern>
		</defs>
		<rect
			x={uiState.viewBox.x}
			y={uiState.viewBox.y}
			width={uiState.viewBox.width}
			height={uiState.viewBox.height}
			fill="url(#dot-pattern)"
		/>
		{#each Object.entries($graphManager.components) as [_, { id, size, position, type, handles: connections }] (id)}
			<Component
				{id}
				{size}
				{position}
				{type}
				{connections}
				uiState={$editorViewModel}
			></Component>
		{/each}
		{#each Object.entries($graphManager.wires) as [_, { id, input, output }]}
			<Wire {id} {input} {output} uiState={$editorViewModel}></Wire>
		{/each}
	</svg>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100%;
		height: 100%;
	}
</style>

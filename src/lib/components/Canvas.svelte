<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import Wire from "$lib/components/Wire.svelte";
	import { GRID_SIZE } from "$lib/util/global";
	import { graphManager } from "$lib/util/graph";
	import { canvasViewModel, viewModel } from "$lib/util/viewModels";

	let svg: SVGSVGElement;

	$: {
		console.log("Data Change:");
		console.log($graphManager);
	}
	$: {
		console.log("UiState Change:");
		console.log($viewModel.uiState);
	}

	$: canvasViewModel.svg = svg;

	function pan(e: MouseEvent) {
		canvasViewModel.pan(e.movementX, e.movementY);
	}
	function startPan() {
		canvasViewModel.startPan();
	}
	function endPan() {
		canvasViewModel.endPan();
	}
	function zoom() {}
</script>

<div class="canvasWrapper">
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<svg
		bind:this={svg}
		on:mousedown={startPan}
		on:mousemove={pan}
		on:mouseup={endPan}
		on:mouseleave={endPan}
		on:wheel={zoom}
		width="100%"
		height="100%"
		xmlns="http://www.w3.org/2000/svg"
		stroke-width="2px"
		viewBox="{$canvasViewModel.viewBox.x} {$canvasViewModel.viewBox
			.y} {$canvasViewModel.viewBox.width} {$canvasViewModel.viewBox.height}"
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
			x={$canvasViewModel.viewBox.x}
			y={$canvasViewModel.viewBox.y}
			width={$canvasViewModel.viewBox.width}
			height={$canvasViewModel.viewBox.height}
			fill="url(#dot-pattern)"
		/>
		{#each Object.entries($graphManager.components) as [id_as_key, { id, label, size, position, type, connections }] (id)}
			<Component
				{id}
				{label}
				{size}
				{position}
				{type}
				{connections}
				uiState={$viewModel.uiState}
			></Component>
		{/each}
		{#each Object.entries($graphManager.wires) as [id_as_key, { id, label, input, output }]}
			<Wire {label} {id} {input} {output} uiState={$viewModel.uiState}></Wire>
		{/each}
	</svg>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100%;
		height: 100%;
	}
</style>

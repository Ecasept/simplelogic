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

	export let uiState: CanvasUiState;

	let svg: SVGSVGElement;

	$: canvasViewModel.svg = svg; // TODO bad code

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
		{#each Object.entries($graphManager.components) as [id_as_key, { id, label, size, position, type, handles: connections }] (id)}
			<Component
				{id}
				{label}
				{size}
				{position}
				{type}
				{connections}
				uiState={$editorViewModel}
			></Component>
		{/each}
		{#each Object.entries($graphManager.wires) as [id_as_key, { id, label, input, output }]}
			<Wire {label} {id} {input} {output} uiState={$editorViewModel}></Wire>
		{/each}
	</svg>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100%;
		height: 100%;
	}
</style>

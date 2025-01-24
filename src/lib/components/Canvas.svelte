<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import Wire from "$lib/components/Wire.svelte";
	import {
		canvasViewModel,
		editorViewModel,
		graphManager,
	} from "$lib/util/actions";
	import { GRID_SIZE } from "$lib/util/global";
	import type { CanvasUiState } from "$lib/util/viewModels/canvasViewModel";

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

	/**
	 * The most recent event for all currently active pointers.
	 */
	const pointerEventCache: PointerEvent[] = [];

	function onPointerDown(event: PointerEvent) {
		event.preventDefault();
		pointerEventCache.push(event);
		startPan();
	}

	function removeEvent(ev: PointerEvent) {
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === ev.pointerId,
		);
		pointerEventCache.splice(index, 1);
	}

	function onPointerExit(event: PointerEvent) {
		removeEvent(event);
		endPan();
	}

	function onPointerMove(event: PointerEvent) {
		// Update current event in cache
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === event.pointerId,
		);
		pointerEventCache[index] = event;

		if (pointerEventCache.length === 1) {
			event.preventDefault();
			pan(event);
		} else if (pointerEventCache.length === 2) {
			event.preventDefault();
			const [p1, p2] = pointerEventCache;
			const distance = Math.hypot(
				p1.clientX - p2.clientX,
				p1.clientY - p2.clientY,
			);
			const oldDistance = Math.hypot(
				p1.clientX - p1.movementX - (p2.clientX - p2.movementX),
				p1.clientY - p1.movementY - (p2.clientY - p2.movementY),
			);

			const factor = oldDistance / distance;

			canvasViewModel.zoom(factor, {
				x: (p1.clientX + p2.clientX) / 2,
				y: (p1.clientY + p2.clientY) / 2,
			});
		}
	}

	let graphData = $derived(graphManager.graphData);
</script>

<div class="canvasWrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		role="application"
		onwheel={zoom}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerExit}
		onpointercancel={onPointerExit}
		onpointerleave={onPointerExit}
		ondragstart={(e) => e.preventDefault()}
		width="100%"
		height="100%"
		style="width: 100vw; height: 100vh;"
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

		{#each Object.entries(graphData.components) as [_, { id, size, position, type, handles, isPoweredInitially }] (id)}
			<Component
				{id}
				{size}
				{position}
				{type}
				{handles}
				{isPoweredInitially}
				uiState={$editorViewModel}
			></Component>
		{/each}
		{#each Object.entries(graphData.wires) as [_, { id, input, output }]}
			<Wire {id} {input} {output} uiState={$editorViewModel}></Wire>
		{/each}
	</svg>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100%;
		height: 100%;
		background-color: var(--canvas-background-color);
		touch-action: none;
	}
</style>

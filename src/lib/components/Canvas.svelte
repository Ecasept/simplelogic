<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import Wire from "$lib/components/Wire.svelte";
	import {
		canvasViewModel,
		EditorAction,
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

	function pan(movementX: number, movementY: number) {
		canvasViewModel.pan(movementX, movementY);
	}
	function startPanning() {
		const editMode = editorViewModel.uiState.editMode;
		if ([null, "simulate", "delete"].includes(editMode)) {
			EditorAction.startPanning();
		}
	}
	function stopPanning() {
		if (pointerEventCache.length === 0) {
			EditorAction.stopPanning();
		}
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
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		pointerEventCache.push(event);
		startPanning();
	}

	function removeEvent(ev: PointerEvent) {
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === ev.pointerId,
		);
		if (index !== -1) {
			pointerEventCache.splice(index, 1);
		}
	}

	function onPointerExit(event: PointerEvent) {
		removeEvent(event);
		stopPanning();
	}

	function onPointerMove(event: PointerEvent) {
		// Update current event in cache
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === event.pointerId,
		);
		if (index === -1) {
			// onPointerDown was not triggered on canvas
			// -> user is not panning
			return;
		}
		const oldEvent = pointerEventCache[index];
		pointerEventCache[index] = event;

		// Depending on the number of pointers, pan or zoom
		if (pointerEventCache.length === 1) {
			event.preventDefault();
			const movementX = event.clientX - oldEvent.clientX;
			const movementY = event.clientY - oldEvent.clientY;
			pan(movementX, movementY);
		} else if (pointerEventCache.length === 2) {
			event.preventDefault();
			const [p1, p2] = pointerEventCache;
			const distance = Math.hypot(
				p1.clientX - p2.clientX,
				p1.clientY - p2.clientY,
			);

			// Get both events, but this time replace the current event with the old one
			const [oldP1, oldP2] = pointerEventCache.map((ev, i) =>
				i == index ? oldEvent : ev,
			);
			const oldDistance = Math.hypot(
				oldP1.clientX - oldP2.clientX,
				oldP1.clientY - oldP2.clientY,
			);

			const factor = oldDistance / distance;

			// Zoom around the center of the two pointers
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

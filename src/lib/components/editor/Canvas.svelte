<script lang="ts">
	import Component from "$lib/components/editor/Component.svelte";
	import Wire from "$lib/components/editor/Wire.svelte";
	import {
		canvasViewModel,
		EditorAction,
		editorViewModel,
		graphManager,
	} from "$lib/util/actions.svelte";
	import {
		CANVAS_DOT_RADIUS,
		debugLog,
		GRID_SIZE,
		PAN_THRESHOLD,
	} from "$lib/util/global.svelte";
	import {
		cancelLongPressIfMoved,
		startLongPressTimer,
	} from "$lib/util/longpress";
	import type { CanvasUiState } from "$lib/util/viewModels/canvasViewModel";
	import { P } from "ts-pattern";
	import TextBox from "./TextBox.svelte";

	let { uiState }: { uiState: CanvasUiState } = $props();

	let svg: SVGSVGElement;

	$effect(() => {
		// update the svg element in the canvas view model
		canvasViewModel.svg = svg;
	});

	function pan(movementX: number, movementY: number) {
		canvasViewModel.pan(movementX, movementY);
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

	function startPanning() {
		const uiState = editorViewModel.uiState;
		if (uiState.matches({ isPanning: true })) return;

		if (
			uiState.matches({ mode: P.union("simulate", "delete") }) ||
			uiState.matches({ editType: "idle" })
		) {
			EditorAction.startPanning();
		}
	}

	function stopPanning() {
		if (uiState.isAreaSelecting) {
			EditorAction.stopAreaSelection();
		} else if (pointerEventCache.length === 0) {
			EditorAction.stopPanning();
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		if (event.shiftKey) {
			const uiState = editorViewModel.uiState;
			if (uiState.matches({ isPanning: true })) return;

			if (uiState.matches({ editType: "idle" })) {
				EditorAction.startAreaSelection(
					canvasViewModel.clientToSVGCoords({
						x: event.clientX,
						y: event.clientY,
					}),
				);
			}
		}
		event.preventDefault();
		pointerEventCache.push(event);
		startPanning();
		startLongPressTimer({ x: event.clientX, y: event.clientY }, () => {
			stopPanning();
			EditorAction.startAreaSelection(
				canvasViewModel.clientToSVGCoords({
					x: event.clientX,
					y: event.clientY,
				}),
			);
		});
	}

	function removeEvent(ev: PointerEvent) {
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === ev.pointerId,
		);
		if (index !== -1) pointerEventCache.splice(index, 1);
	}
	function onPointerExit(event: PointerEvent) {
		const cuiState = canvasViewModel.uiState;
		if (cuiState.isPanning && cuiState.moveAmount < PAN_THRESHOLD) {
			// If the user only clicked and didn't move the canvas,
			// clear the selection
			editorViewModel.clearSelection();
		}

		removeEvent(event);
		if (editorViewModel.uiState.matches({ isPanning: true })) {
			// Prevent the page from registering the pointer event
			// as the user releasing a component
			event.stopPropagation();
		}
		stopPanning();
	}

	function onPointerMove(event: PointerEvent) {
		cancelLongPressIfMoved({ x: event.clientX, y: event.clientY });
		// Update current event in cache
		const index = pointerEventCache.findIndex(
			(cachedEv) => cachedEv.pointerId === event.pointerId,
		);
		if (index === -1) {
			// onPointerDown was not triggered on canvas
			// -> user is not panning
			return;
		}

		if (uiState.isAreaSelecting) {
			canvasViewModel.updateAreaSelection(
				canvasViewModel.clientToSVGCoords({
					x: event.clientX,
					y: event.clientY,
				}),
			);
			return;
		}

		const oldEvent = pointerEventCache[index];
		pointerEventCache[index] = event;

		// One pointer -> pan (if panning started), Two pointers -> pinch zoom
		if (pointerEventCache.length === 1) {
			if (editorViewModel.uiState.matches({ isPanning: true })) {
				event.preventDefault();
				const movementX = event.clientX - oldEvent.clientX;
				const movementY = event.clientY - oldEvent.clientY;
				pan(movementX, movementY);
			}
		} else if (pointerEventCache.length === 2) {
			event.preventDefault();
			const [p1, p2] = pointerEventCache.slice(-2);
			const distance = Math.hypot(
				p1.clientX - p2.clientX,
				p1.clientY - p2.clientY,
			);

			const [oldP1, oldP2] = pointerEventCache
				.map((ev, i) => (i == index ? oldEvent : ev))
				.slice(-2);
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

	$inspect(graphData).with(debugLog("GRAPH DATA"));
</script>

<div class="canvasWrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		class="canvas"
		role="application"
		onwheel={zoom}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerExit}
		onpointerleave={onPointerExit}
		ondragstart={(e) => e.preventDefault()}
		preserveAspectRatio="xMinYMin slice"
		xmlns="http://www.w3.org/2000/svg"
		stroke-width="2px"
		viewBox="{uiState.viewBox.x} {uiState.viewBox.y} {uiState.viewBox
			.width} {uiState.viewBox.height}"
	>
		<defs>
			<pattern
				id="dot-pattern"
				x={-CANVAS_DOT_RADIUS}
				y={-CANVAS_DOT_RADIUS}
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

		{#each Object.entries(graphData.wires) as [id, data] (id)}
			<Wire {...data} uiState={editorViewModel.uiState} renderMode="body"
			></Wire>
		{/each}
		{#each Object.entries(graphData.wires) as [id, data] (id)}
			<Wire {...data} uiState={editorViewModel.uiState} renderMode="handles"
			></Wire>
		{/each}
		{#each Object.entries(graphData.components) as [id, data] (id)}
			{#if data.type === "TEXT"}
				<TextBox {...data} uiState={editorViewModel.uiState}></TextBox>
			{:else}
				<Component {...data} uiState={editorViewModel.uiState}></Component>
			{/if}
		{/each}

		{#if uiState.isAreaSelecting}
			{@const startPos = uiState.startPos}
			{@const currentPos = uiState.currentPos}
			<rect
				x={Math.min(startPos.x, currentPos.x)}
				y={Math.min(startPos.y, currentPos.y)}
				width={Math.abs(currentPos.x - startPos.x)}
				height={Math.abs(currentPos.y - startPos.y)}
				fill="var(--selected-outline-color)"
				fill-opacity="0.3"
				stroke="var(--selected-outline-color)"
				stroke-dasharray="4"
			></rect>
		{/if}
	</svg>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100%;
		height: 100%;
		background-color: var(--canvas-background-color);
		touch-action: none;

		/** Prevent long presses on mobile from selecting text */
		-webkit-user-select: none;
		-moz-user-select: -moz-none;
		-ms-user-select: none;
		user-select: none;

		.canvas {
			width: 100lvw;
			height: 100lvh;
		}
	}
</style>

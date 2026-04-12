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
		isVibrateSupported,
		PAN_THRESHOLD,
	} from "$lib/util/global.svelte";
	import {
		cancelLongPress,
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

	const activePointerSlots: [PointerEvent | null, PointerEvent | null] = [null, null];
	let areaSelectPointerId: number | null = null;

	/** Converts a pointer event's client coordinates to SVG world coordinates. */
	function toSvgPosition(event: PointerEvent) {
		return canvasViewModel.clientToSVGCoords({
			x: event.clientX,
			y: event.clientY,
		});
	}

	/** Returns the number of currently tracked gesture pointers (0..2). */
	function getActivePointerCount() {
		return activePointerSlots[0] === null
			? activePointerSlots[1] === null
				? 0
				: 1
			: activePointerSlots[1] === null
				? 1
				: 2;
	}

	/** Returns both active pointers when two are present, otherwise null. */
	function getTwoActivePointers(): [PointerEvent, PointerEvent] | null {
		const first = activePointerSlots[0];
		const second = activePointerSlots[1];
		if (!first || !second) return null;
		return [first, second];
	}

	/** Clears both gesture pointer slots. */
	function clearActivePointers() {
		activePointerSlots[0] = null;
		activePointerSlots[1] = null;
	}

	/** Adds a pointer to the first available gesture slot; returns true if inserted. */
	function addActivePointer(event: PointerEvent) {
		const hasPointer = activePointerSlots.some(
			(activePointer) => activePointer?.pointerId === event.pointerId,
		);
		if (hasPointer) return false;

		const emptySlotIndex = activePointerSlots.findIndex(
			(activePointer) => activePointer === null,
		);
		if (emptySlotIndex !== -1) {
			activePointerSlots[emptySlotIndex] = event;
			return true;
		}

		return false;
	}

	/** Updates an existing pointer slot and returns the previous event snapshot. */
	function updateActivePointer(event: PointerEvent) {
		const slotIndex = activePointerSlots.findIndex(
			(activePointer) => activePointer?.pointerId === event.pointerId,
		);
		if (slotIndex === -1) return null;

		const previousEvent = activePointerSlots[slotIndex];
		activePointerSlots[slotIndex] = event;
		if (previousEvent) return previousEvent;
		return null;
	}

	/** Removes a pointer by id from tracked gesture slots; returns true if removed. */
	function removeActivePointer(pointerId: number) {
		const slotIndex = activePointerSlots.findIndex(
			(activePointer) => activePointer?.pointerId === pointerId,
		);
		if (slotIndex === -1) return false;
		activePointerSlots[slotIndex] = null;
		return true;
	}

	/** Starts area selection and records the owning pointer id. */
	function beginAreaSelection(event: PointerEvent) {
		areaSelectPointerId = event.pointerId;
		EditorAction.startAreaSelection(toSvgPosition(event));
	}

	/** Requests panning mode if current editor state allows it. */
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

	/** Stops area selection or panning when no active gesture pointers remain. */
	function stopPanning() {
		if (uiState.isAreaSelecting) {
			EditorAction.stopAreaSelection();
		} else if (getActivePointerCount() === 0) {
			EditorAction.stopPanning();
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;

		const uiState = editorViewModel.uiState;
		if (uiState.matches({ editType: "idle", isPanning: false })) {
			if (event.shiftKey) {
				// If shift is held, start area selection
				beginAreaSelection(event);
				event.preventDefault();
				return;
			} else {
				startLongPressTimer({ x: event.clientX, y: event.clientY }, () => {
					clearActivePointers();
					stopPanning();
					if (isVibrateSupported()) {
						navigator.vibrate(10);
					}
					beginAreaSelection(event);
				});
			}
		}
		event.preventDefault();
		if (addActivePointer(event)) {
			startPanning();
		}
	}

	/** Handles pointer release/leave, slot cleanup, and panning teardown. */
	function onPointerExit(event: PointerEvent) {
		// Cancel any pending long press
		cancelLongPress();

		if (uiState.isAreaSelecting) {
			if (areaSelectPointerId === event.pointerId) {
				areaSelectPointerId = null;
				EditorAction.stopAreaSelection();
			}
			return;
		}

		if (!removeActivePointer(event.pointerId)) return;

		const cuiState = canvasViewModel.uiState;
		if (cuiState.isPanning && cuiState.moveAmount < PAN_THRESHOLD) {
			// If the user only clicked and didn't move the canvas,
			// clear the selection
			editorViewModel.clearSelection();
		}

		if (editorViewModel.uiState.matches({ isPanning: true })) {
			// Prevent the page from registering the pointer event
			// as the user releasing a component
			event.stopPropagation();
		}

		if (getActivePointerCount() === 0) {
			EditorAction.stopPanning();
		}
	}

	function onPointerMove(event: PointerEvent) {
		cancelLongPressIfMoved({ x: event.clientX, y: event.clientY });
		if (uiState.isAreaSelecting) {
			if (areaSelectPointerId === event.pointerId) {
				canvasViewModel.updateAreaSelection(toSvgPosition(event));
			}
			return;
		}

		// Update current event in cache
		const oldEvent = updateActivePointer(event);

		if (!oldEvent) {
			// pointerId not found in active pointers
			// -> no pointerDown was ever triggered on the canvas for this pointerId
			// -> we are not responsible for handling this pointer
			return;
		}

		const activeCount = getActivePointerCount();

		// One pointer -> pan (if panning started), Two pointers -> pinch zoom
		if (activeCount === 1) {
			if (editorViewModel.uiState.matches({ isPanning: true })) {
				event.preventDefault();
				const movementX = event.clientX - oldEvent.clientX;
				const movementY = event.clientY - oldEvent.clientY;
				pan(movementX, movementY);
			}
		} else if (activeCount === 2) {
			const activePointers = getTwoActivePointers();
			if (!activePointers) return;

			event.preventDefault();
			const [p1, p2] = activePointers;
			const distance = Math.hypot(
				p1.clientX - p2.clientX,
				p1.clientY - p2.clientY,
			);

			const oldP1 = p1.pointerId === event.pointerId ? oldEvent : p1;
			const oldP2 = p2.pointerId === event.pointerId ? oldEvent : p2;

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

			// Pan based on the movement of the center of the two pointers
			const oldCenter = {
				x: (oldP1.clientX + oldP2.clientX) / 2,
				y: (oldP1.clientY + oldP2.clientY) / 2,
			};
			const newCenter = {
				x: (p1.clientX + p2.clientX) / 2,
				y: (p1.clientY + p2.clientY) / 2,
			};
			pan(newCenter.x - oldCenter.x, newCenter.y - oldCenter.y);
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

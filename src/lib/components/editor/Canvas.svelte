<script lang="ts">
	import Component from "$lib/components/editor/Component.svelte";
	import Wire from "$lib/components/editor/Wire.svelte";
	import TextBox from "./TextBox.svelte";
	import {
		canvasViewModel,
		editorViewModel,
		graphManager,
		interactionController,
	} from "$lib/util/actions.svelte";
	import { CANVAS_DOT_RADIUS, GRID_SIZE } from "$lib/util/global.svelte";
	import { normalizePointer } from "$lib/util/interaction.svelte";
	import type { CanvasUiState } from "$lib/util/viewModels/canvasViewModel";

	let { uiState }: { uiState: CanvasUiState } = $props();
	let svg: SVGSVGElement;
	let graphData = $derived(graphManager.graphData);
	let gesture = $derived(interactionController.gesture);

	$effect(() => {
		canvasViewModel.svg = svg;
		return () => {
			canvasViewModel.svg = null;
		};
	});
</script>

<div class="canvasWrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svg}
		class="canvas"
		role="application"
		onwheel={(e) => {
			e.preventDefault();
			interactionController.wheel(e.deltaY, { x: e.clientX, y: e.clientY });
		}}
		onpointerdown={(e) => {
			e.preventDefault();
			interactionController.canvasPointerDown(normalizePointer(e));
		}}
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

		{#if gesture.kind === "area"}
			{@const startPos = gesture.startPos}
			{@const currentPos = gesture.currentPos}
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

<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import { graph } from '$lib/stores/stores';
	import { onMount } from 'svelte';

	let gridSize = 50;
	let updatePosition: ((x: number, y: number) => void) | null = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let canvas: HTMLDivElement;
	let mouseStartOffset = { x: 0, y: 0 };

	let graph_data: {
		id: number;
		label: string;
		size: { x: number; y: number; };
		position: { x: number; y: number; };
		input: number[];
		output: number[];
	}[] = [];

	onMount(() => {
		graph.subscribe((data) => {
			graph_data = data;
		});
	});

	function onCmpDown(e) {
		grabbedCmp = e.detail.component;
		updatePosition = e.detail.updatePosition;
		grabbedCmp?.classList.add('grabbed');
		mouseStartOffset = e.detail.mouseOffset;
	}

	function onMouseMove(e: MouseEvent) {
		if (updatePosition === null) return;
		updatePosition(e.clientX - mouseStartOffset.x, e.clientY - mouseStartOffset.y);
	}

	function onMouseUp(e) {
		grabbedCmp?.classList.remove('grabbed');
		grabbedCmp = null;
		updatePosition = null;
	}

	export function addCmp(cmp) {
		graph.update((data) => {
			data[data.length] = {
				id: graph_data.length,
				label: 'test',
				size: { x: 200, y: 200 },
				position: { x: 400, y: 400 },
				inputs: [],
				outputs: []
			}
			return data;
		});
	}
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each graph_data as { label, position }, id}
		<Component {id} {label} {position} on:componentDown={onCmpDown}></Component>
	{/each}
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100vw;
		height: 100vh;
		background-size: 50px 50px;
		background-position: -24px -24px;
		background-image: radial-gradient(circle, #000000 1px, rgba(0, 0, 0, 0) 1px);

	}
</style>
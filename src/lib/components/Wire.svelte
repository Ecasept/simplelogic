<script lang="ts">
	import { graph } from '$lib/stores/stores';
	import { gridSnap } from '$lib/util/global';
	import type { HandleDownEvent, WireIO } from '$lib/util/types';
	import { createEventDispatcher, onMount } from 'svelte';

	export let id: number;
	export let label: string;
	export let input: WireIO;
	export let output: WireIO;

	const dispatch = createEventDispatcher<{
		handleDown: HandleDownEvent,
	}>();

	onMount(() => {
		if (output.id !== -1) {
			window.addEventListener("mousemove", updateInputPosition);
			window.addEventListener("mouseup", setInputPosition);
		} else {
			window.addEventListener("mousemove", updateOutputPosition);
			window.addEventListener("mouseup", setOutputPosition);
		}
	});

	function updateOutputPosition(e: MouseEvent) {
		output.x = e.clientX;
		output.y = e.clientY;
	}

	function updateInputPosition(e: MouseEvent) {
		input.x = e.clientX;
		input.y = e.clientY;
	}

	function setOutputPosition(e: MouseEvent) {
		graph.update((data) => {
			data.wires[id].output.x = gridSnap(e.clientX);
			data.wires[id].output.y = gridSnap(e.clientY);
			return data;
		});
		window.removeEventListener("mousemove", updateOutputPosition);
		window.removeEventListener("mouseup", setOutputPosition);
	}

	function setInputPosition(e: MouseEvent) {
		graph.update((data) => {
			data.wires[id].input.x = gridSnap(e.clientX);
			data.wires[id].input.y = gridSnap(e.clientY);
			return data;
		});
		window.removeEventListener("mousemove", updateInputPosition);
		window.removeEventListener("mouseup", setInputPosition);
	}

	function handleDown(type: string, e: MouseEvent) {
		e.preventDefault();		
		const handle = type === "input" ? input : output;
		dispatch('handleDown', {
			type: type,
			handleIndex: 0,
			handleX: handle.x,
			handleY: handle.y,
			id: id,
		});
	}

	function onMouseEnter(e: MouseEvent) {
		(e.target as HTMLElement).setAttribute("r", "10");
	}

	function onMouseLeave(e: MouseEvent) {
		(e.target as HTMLElement).setAttribute("r", "5");
	}

</script>

<path d="M{input.x+1} {input.y+1} L{output.x+1} {output.y+1}" stroke="black" fill="none"></path>
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
{#if input.id === -1}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave} class="handle" cx="{input.x}" cy="{input.y}" r="5" on:mousedown={(e) => handleDown("input", e)}></circle>
{/if}
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if output.id === -1}
	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<circle on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave} class="handle" cx="{output.x}" cy="{output.y}" r="5"  on:mousedown={(e) => handleDown("output", e)} ></circle>
{/if}

<style>
	.handle {
		pointer-events: all;
	}
</style>
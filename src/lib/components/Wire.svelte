<script lang="ts">
  import { graph } from '$lib/stores/stores';
  import { gridSnap } from '$lib/util/global';
	import type { ComponentDownEvent, HandleDownEvent, WireAddEvent, WireIO } from '$lib/util/types';
	import { createEventDispatcher, onMount } from 'svelte';

	export let id: number;
	export let label: string;
	export let input: WireIO;
	export let output: WireIO;

	let inputHandle;
	let outputHandle;
	let handleVisible = false;
	const dispatch = createEventDispatcher<{
		componentDown: ComponentDownEvent,
		handleDown: HandleDownEvent,
		wireAdd: WireAddEvent,
	}>();

	onMount(() => {
		dispatch("wireAdd", {
			updatePosition: updateEndPosition,
			setPosition: setEndPosition,
		});
	});

	function updateEndPosition(x: number, mouseStartOffsetX: number, y: number, mouseStartOffsetY: number) {
		output.x = x;
		output.y = y;
	}

	function setEndPosition(x: number, mouseStartOffsetX: number, y: number, mouseStartOffsetY: number) {
		graph.update((data) => {
			data.wires[id].output = {
				x: gridSnap(x),
				y: gridSnap(y),
				id: -1
			}
			return data;
		});
	}

	function handleDown(pos: string, e: MouseEvent) {
		e.preventDefault();		
		const handle = pos === "input" ? input : output;
		dispatch('handleDown', {
			pos: pos,
			handleIndex: 0,
			handleX: handle.x,
			handleY: handle.y,
			id: id,
		});
	}

	function onMouseOver(e: MouseEvent) {
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
	<circle on:mouseover={onMouseOver} on:mouseleave={onMouseLeave} class="handle" cx="{input.x}" cy="{input.y}" r="5" on:mousedown={(e) => handleDown("input", e)}></circle>
{/if}
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if output.id === -1}
	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<circle on:mouseover={onMouseOver} on:mouseleave={onMouseLeave} class="handle" cx="{output.x}" cy="{output.y}" r="5"  on:mousedown={(e) => handleDown("output", e)} ></circle>
{/if}

<style lang="scss">
	path {
		margin: 10vh;
	}

	.handle {
		pointer-events: all;
		transform-origin: center center;
		&:hover {
			r: 30;
			// transform: scale(2, 2);
		}
	}
</style>
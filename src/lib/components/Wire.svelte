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

	function hover(e: MouseEvent) {
		handleVisible = true;
	}
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<path d="M{input.x+1} {input.y+1} L{output.x+1} {output.y+1}" stroke="black" fill="none" on:mouseover={hover}></path>
{#if input.id === -1}
	<foreignObject>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="handle" class:handleVisible={"visible"} on:mousedown={(e) => handleDown("input", e)}>
			<div />
		</div>
	</foreignObject>
{/if}
{#if output.id === -1}
	<foreignObject x="20" y="20" width="10" height="10">
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="handle" class:handleVisible={"visible"} on:mousedown={(e) => handleDown("output", e)}>
			<div />
		</div>
	</foreignObject>
{/if}

<style lang="scss">
	path {
		margin: 10vh;
	}

	.handle {
		display: none;
		z-index: 1;
		width: 10px;
		height: 10px;
		padding: 10px;

		:global(.visible) {
			display: block;
		}

		&:hover {
			width: 20px;
			height: 20px;
			padding: 5px;
		}

		div {
			height: 100%;
			width: 100%;
			background-color: black;
			border-radius: 100%;
		}
	}
</style>
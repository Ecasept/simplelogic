<script lang="ts">
	import { gridSnap } from '$lib/util/global';
	import { AddWireCommand, executeCommand, SetWireIOCommand } from '$lib/util/graph';
	import type { WireIO } from '$lib/util/types';
	import { onMount } from 'svelte';

	export let id: number;
	export let label: string;
	export let input: WireIO;
	export let output: WireIO;

	let mouseMoveHandler: (e: MouseEvent) => void;
	let mouseUpHandler: (e: MouseEvent) => void;

	onMount(() => {
		if (output.id !== -1) {
			mouseMoveHandler = (e: MouseEvent) => updatePosition("input", e);
			mouseUpHandler = (e: MouseEvent) => setPosition("input", e);
		} else {
			mouseMoveHandler = (e: MouseEvent) => updatePosition("output", e);
			mouseUpHandler = (e: MouseEvent) => setPosition("output", e);
		}

		window.addEventListener("mousemove", mouseMoveHandler);
		window.addEventListener("mouseup", mouseUpHandler);
	});

	function updatePosition(pos: "input" | "output", e: MouseEvent) {
		if (pos ===  "input") {
			input.x = e.clientX;
			input.y = e.clientY;
		} else {
			output.x = e.clientX;
			output.y = e.clientY;
		}
	}

	function setPosition(type: "input" | "output", e: MouseEvent) {
		const cmd = new SetWireIOCommand(
			{
				x: gridSnap(e.clientX),
				y: gridSnap(e.clientY),
				id: -1
			},
			type,
			id
		)
		executeCommand(cmd);

        window.removeEventListener("mousemove", mouseMoveHandler);
        window.removeEventListener("mouseup", mouseUpHandler);
	}

	function handleDown(type: string, e: MouseEvent) {
		e.preventDefault();
		const handle = type === "input" ? input : output;
		const cmd = new AddWireCommand({
				label: 'test',
				input: {
					x: handle.x,
					y: handle.y,
					id: type === "output" ? id : -1,
				},
				output: {
					x: handle.x,
					y: handle.y,
					id: type === "input" ? id : -1,
				},
		});
		executeCommand(cmd);
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
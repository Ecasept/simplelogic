<script lang="ts">
	import { gridSnap, isClickOverSidebar } from "$lib/util/global";
	import {
		AddWireCommand,
		executeCommand,
		MoveWireConnectionCommand,
	} from "$lib/util/graph";
	import type {
		ComponentConnection,
		HandleType,
		WireConnection,
		WireHandle,
	} from "$lib/util/types";
	import { json } from "@sveltejs/kit";
	import { createEventDispatcher, onMount } from "svelte";

	export let id: number | null; // when the wire is being created, id is null
	export let label: string;
	export let input: WireHandle;
	export let output: WireHandle;
	/** The handle that the wire should start at when it is being created*/
	export let start: HandleType | null = null;
	/** The connection to the connected object when the wire is being created*/
	export let connection: ComponentConnection | WireConnection | null = null;

	let mouseMoveHandler: (e: MouseEvent) => void;
	let mouseUpHandler: (e: MouseEvent) => void;

	const dispatch = createEventDispatcher<{ delete: null }>();

	onMount(() => {
		if (id === null) {
			if (start === null) {
				console.error("Wire was added without connection info");
				dispatch("delete");
				return;
			}

			const end = start === "input" ? "output" : "input";

			// Update end handle
			mouseMoveHandler = (e) => updatePosition(end, e);
			mouseUpHandler = (e) => setPosition(end, e);

			window.addEventListener("mousemove", mouseMoveHandler);
			window.addEventListener("mouseup", mouseUpHandler);
		}
	});

	function updatePosition(type: HandleType, e: MouseEvent) {
		if (type === "input") {
			input.x = gridSnap(e.clientX);
			input.y = gridSnap(e.clientY);
		} else {
			output.x = gridSnap(e.clientX);
			output.y = gridSnap(e.clientY);
		}
	}

	function setPosition(type: HandleType, e: MouseEvent) {
		if (isClickOverSidebar(e)) {
			return;
		}
		if (id === null) {
			updatePosition(type, e);
			if (connection === null || start === null) {
				console.error("Wire was added without connection info");
				dispatch("delete");
				return;
			}
			const cmd = new AddWireCommand(
				{
					label: label,
					input: input,
					output: output,
				},
				connection,
				start,
			);
			executeCommand(cmd);
			window.removeEventListener("mousemove", mouseMoveHandler);
			window.removeEventListener("mouseup", mouseUpHandler);
			dispatch("delete");
		} else {
			const cmd = new MoveWireConnectionCommand(
				{
					x: gridSnap(e.clientX),
					y: gridSnap(e.clientY),
				},
				type,
				id,
			);
			executeCommand(cmd);
			window.removeEventListener("mousemove", mouseMoveHandler);
			window.removeEventListener("mouseup", mouseUpHandler);
		}
	}

	function handleDown(type: string, e: MouseEvent) {
		e.preventDefault();
		if (id === null) {
			console.error("Tried to click handle on not initialized wire");
			return;
		}
		const handle = type === "input" ? input : output;
		const cmd = new AddWireCommand({
			label: "test",
			input: {
				x: handle.x,
				y: handle.y,
				id: type === "output" ? id : null,
			},
			output: {
				x: handle.x,
				y: handle.y,
				id: type === "input" ? id : null,
			},
		});
		executeCommand(cmd);
	}

	function onMouseEnter(e: MouseEvent) {
		if (e.target === null) {
			console.error("e.target is null, can't highlight wire handle.");
			return;
		}
		if (!(e.target instanceof Element)) {
			console.error("e.target is not an element, can't highlight wire handle");
			return;
		}
		e.target.setAttribute("r", "10");
	}

	function onMouseLeave(e: MouseEvent) {
		if (e.target === null) {
			console.error("e.target is null, can't dehighlight wire handle.");
			return;
		}
		if (!(e.target instanceof Element)) {
			console.error(
				"e.target is not an element, can't dehighlight wire handle",
			);
			return;
		}
		e.target.setAttribute("r", "5");
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape" && id === null) {
			window.removeEventListener("mousemove", mouseMoveHandler);
			window.removeEventListener("mouseup", mouseUpHandler);
			dispatch("delete");
		}
	}
</script>

<svelte:window on:keydown={onKeyDown} />

<path
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="black"
	fill="none"
></path>
{#if input.connection === null && (start === "output" || start === null)}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle
		on:mouseenter={onMouseEnter}
		on:mouseleave={onMouseLeave}
		class="handle"
		cx={input.x}
		cy={input.y}
		r="5"
		on:mousedown={(e) => handleDown("input", e)}
	></circle>
{/if}
{#if output.connection === null && (start === "input" || start === null)}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle
		on:mouseenter={onMouseEnter}
		on:mouseleave={onMouseLeave}
		class="handle"
		cx={output.x}
		cy={output.y}
		r="5"
		on:mousedown={(e) => handleDown("output", e)}
	></circle>
{/if}

<style>
	.handle {
		pointer-events: all;
	}
</style>

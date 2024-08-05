<script lang="ts">
	import { isClickOverSidebar } from "$lib/util/global";
	import type { WireHandle } from "$lib/util/types";
	import { viewModel, type UiState } from "$lib/util/viewModels";

	export let id: number;
	export let label: string;
	export let input: WireHandle;
	export let output: WireHandle;

	export let uiState: UiState;

	$: addingThis = id === uiState.addingId;

	function onMouseMove(e: MouseEvent) {
		if (!addingThis) {
			return;
		}
		if (uiState.movingWireHandleType === null) {
			console.error(
				"Tried to move wire connection when no clicked handle was defined",
			);
			return;
		}
		viewModel.moveWireConnectionReplaceable(
			uiState.movingWireHandleType === "input"
				? { x: input.x, y: input.y }
				: { x: output.x, y: output.y },
			{ x: e.clientX, y: e.clientY },
			uiState.movingWireHandleType,
			id,
		);
	}

	function onMouseUp(e: MouseEvent) {
		if (!addingThis) {
			return;
		}
		if (isClickOverSidebar(e)) {
			return;
		}
		viewModel.applyChanges();
	}

	function handleDown(type: string, e: MouseEvent) {
		console.error("Not Implemented");
		return;
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
		graph.executeCommand(cmd);
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
		if (!addingThis) {
			return;
		}
		if (e.key === "Escape") {
			viewModel.cancelChanges();
		}
	}
</script>

<svelte:window
	on:keydown={onKeyDown}
	on:mousemove={onMouseMove}
	on:mouseup={onMouseUp}
/>

<path
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="black"
	fill="none"
></path>
{#if input.connection === null}
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
{#if output.connection === null}
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

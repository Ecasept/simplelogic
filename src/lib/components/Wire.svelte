<script lang="ts">
	import { isClickOverSidebar } from "$lib/util/global";
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { editorViewModel, type UiState } from "$lib/util/viewModels";

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
		editorViewModel.moveWireConnectionReplaceable(
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
		editorViewModel.applyChanges();
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

	let hoveringHandle: HandleType | null = null;

	function onMouseEnter(handleType: HandleType) {
		hoveringHandle = handleType;
	}

	function onMouseLeave() {
		hoveringHandle = null;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!addingThis) {
			return;
		}
		if (e.key === "Escape") {
			editorViewModel.cancelChanges();
		}
	}
	let r = { input: 5, output: 5 };
	$: {
		let newR = { input: 5, output: 5 };
		const isBeingEdited =
			uiState.addingId !== null || uiState.movingId !== null;
		if (!isBeingEdited) {
			if (hoveringHandle !== null) {
				newR[hoveringHandle] = 10;
			}
		}

		r = newR;
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
		on:mouseenter={() => {
			onMouseEnter("input");
		}}
		on:mouseleave={onMouseLeave}
		class="handle"
		cx={input.x}
		cy={input.y}
		r={r.input}
		on:mousedown={(e) => handleDown("input", e)}
	></circle>
{/if}
{#if output.connection === null}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle
		on:mouseenter={() => {
			onMouseEnter("output");
		}}
		on:mouseleave={onMouseLeave}
		class="handle"
		cx={output.x}
		cy={output.y}
		r={r.output}
		on:mousedown={(e) => handleDown("output", e)}
	></circle>
{/if}

<style>
	.handle {
		pointer-events: all;
	}
</style>

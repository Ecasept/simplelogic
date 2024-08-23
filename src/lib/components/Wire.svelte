<script lang="ts">
	import { isClickOverSidebar } from "$lib/util/global";
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import { editorViewModel } from "$lib/util/actions";

	export let id: number;
	export let label: string;
	export let input: WireHandle;
	export let output: WireHandle;

	export let uiState: EditorUiState;

	$: editingThis = uiState.id === id;

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
		console.log("enter");
		hoveringHandle = handleType;
	}

	function onMouseLeave() {
		console.log("leave");
		hoveringHandle = null;
	}

	let r = { input: 5, output: 5 };
	$: {
		let newR = { input: 5, output: 5 };
		if (editingThis) {
			// Do nothing
		} else if (uiState.state !== null) {
			// Adding/moving something else
			if (hoveringHandle !== null) {
				newR[hoveringHandle] = 10;
			}
		} else {
			// Not adding/moving anything
			if (hoveringHandle !== null) {
				newR[hoveringHandle] = 10;
			}
		}
		r = newR;
	}
</script>

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

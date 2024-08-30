<script lang="ts">
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import { editorViewModel } from "$lib/util/actions";

	export let id: number;
	export let label: string;
	export let input: WireHandle;
	export let output: WireHandle;

	export let uiState: EditorUiState;

	$: editingThis = uiState.editedId === id;
	$: editing = uiState.editType !== null;

	function onHandleDown(clickedHandle: HandleType, e: MouseEvent) {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		let outputConnectedToWire = false;
		if (clickedHandle === "output") {
			if (output.connection !== null && "handleType" in output.connection) {
				// if output is connected to wire
				outputConnectedToWire = true;
			}
		}

		editorViewModel.removeHoveredHandle();
		e.preventDefault();
		e.stopPropagation();
		editorViewModel.startMoveWire(id, outputConnectedToWire, clickedHandle);
	}

	function onHandleEnter(handleType: HandleType) {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		editorViewModel.setHoveredHandle({ handleType: handleType, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let hoverR = 5;
	let hoveredHandle: string | null = null;
	$: {
		if (editing && !uiState.outputConnectedToWire) {
			// Adding/moving something else
			hoverR = 20;
		} else if (!uiState.outputConnectedToWire) {
			// Not adding/moving anything
			hoverR = 10;
		} else {
			hoverR = 5;
		}
		if (
			uiState.hoveredHandle !== null &&
			id === uiState.hoveredHandle.id &&
			"handleType" in uiState.hoveredHandle
		) {
			hoveredHandle = uiState.hoveredHandle.handleType;
		} else {
			hoveredHandle = null;
		}
	}
</script>

<path
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="black"
	fill="none"
	style="pointer-events: {editingThis ? 'none' : 'all'};"
></path>
{#if input.connection === null}
	<!-- Hide connected inputs -->
	{#if !(uiState.draggedHandle === "input" && !editingThis)}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<circle
			on:mouseenter={() => {
				onHandleEnter("input");
			}}
			on:mouseleave={onHandleLeave}
			class="handle"
			cx={input.x}
			cy={input.y}
			r={hoveredHandle === "input" ? hoverR : 5}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			on:mousedown={(e) => onHandleDown("input", e)}
		></circle>
	{/if}
{/if}
{#if !(output.connection !== null && "handleId" in output.connection)}
	<!-- Hide outputs connected to components -->
	{#if !(uiState.draggedHandle === "output" && !editingThis)}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<circle
			on:mouseenter={() => {
				onHandleEnter("output");
			}}
			on:mouseleave={onHandleLeave}
			class="handle"
			cx={output.x}
			cy={output.y}
			r={hoveredHandle === "output" ? hoverR : 5}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			on:mousedown={(e) => onHandleDown("output", e)}
		></circle>
	{/if}{/if}

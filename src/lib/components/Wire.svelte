<script lang="ts">
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import { EditorAction, editorViewModel } from "$lib/util/actions";

	type Props = {
		id: number;
		input: WireHandle;
		output: WireHandle;
		uiState: EditorUiState;
	};

	let { id, input, output, uiState }: Props = $props();

	let editingThis = $derived(uiState.editedId === id);
	let editing = $derived(uiState.editType !== null);

	function onHandleDown(clickedHandle: HandleType, e: MouseEvent) {
		if (uiState.editType == "delete") {
			return;
		}
		if (e.button !== 0) {
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
		if (uiState.editType == "delete") {
			return;
		}

		editorViewModel.setHoveredHandle({ handleType: handleType, id: id });
	}

	function onHandleLeave() {
		if (uiState.editType == "delete") {
			return;
		}
		editorViewModel.removeHoveredHandle();
	}

	let deletingThis = $derived(uiState.editType == "delete" && editingThis);

	let hoverR = $state(5);
	let fill = $state("black");
	let hoveredHandle: string | null = $state(null);
	$effect(() => {
		if (editing && !uiState.outputConnectedToWire) {
			// Adding/moving something else
			hoverR = 10;
			fill = "purple";
		} else if (!uiState.outputConnectedToWire) {
			// Not adding/moving anything
			hoverR = 10;
			fill = "black";
		} else {
			hoverR = 5;
			fill = deletingThis ? "red" : "black";
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
	});

	let otherFill = $derived(deletingThis ? "red" : "black");
</script>

<path
	class="wire"
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke={otherFill}
	style="pointer-events: {editingThis ? 'none' : 'all'};"
></path>

<path
	role="button"
	tabindex="0"
	class="hitbox"
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="transparent"
	style="pointer-events: {editingThis && !deletingThis ? 'none' : 'all'};"
	stroke-width="10"
	onmouseenter={() => {
		if (uiState.isModalOpen) {
			return;
		}
		editorViewModel.setForDeletion(id);
	}}
	onmouseleave={() => {
		editorViewModel.removeForDeletion();
	}}
	onmousedown={(e: MouseEvent) => {
		if (uiState.isModalOpen || !deletingThis) {
			return;
		}
		if (e.button !== 0) {
			return;
		}
		EditorAction.deleteWire(id);
	}}
></path>

{#if input.connection === null}
	<!-- Hide connected inputs -->
	{#if !(uiState.draggedHandle === "input" && !editingThis)}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		<circle
			role="button"
			tabindex="0"
			onmouseenter={() => {
				onHandleEnter("input");
			}}
			onmouseleave={onHandleLeave}
			class="handle"
			cx={input.x}
			cy={input.y}
			r={hoveredHandle === "input" ? hoverR : 5}
			fill={hoveredHandle === "input" ? fill : otherFill}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("input", e)}
		></circle>
	{/if}
{/if}
{#if !(output.connection !== null && "handleId" in output.connection)}
	<!-- Hide outputs connected to components -->
	{#if !(uiState.draggedHandle === "output" && !editingThis)}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		<circle
			role="button"
			tabindex="0"
			onmouseenter={() => {
				onHandleEnter("output");
			}}
			onmouseleave={onHandleLeave}
			class="handle"
			cx={output.x}
			cy={output.y}
			r={hoveredHandle === "output" ? hoverR : 5}
			fill={hoveredHandle === "output" ? fill : otherFill}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("output", e)}
		></circle>
	{/if}{/if}

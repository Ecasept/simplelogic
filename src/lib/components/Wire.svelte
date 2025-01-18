<script lang="ts">
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import { isWireConnection } from "$lib/util/global";
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";

	type Props = {
		id: number;
		input: WireHandle;
		output: WireHandle;
		uiState: EditorUiState;
	};

	let { id, input, output, uiState }: Props = $props();

	let editingThis = $derived(uiState.draggedWire?.id === id);
	let editingOtherWire = $derived(
		uiState.draggedWire?.id != null && !editingThis,
	);

	function onHandleDown(clickedHandle: HandleType, e: MouseEvent) {
		if (uiState.editType != null) {
			return;
		}
		if (e.button !== 0) {
			return;
		}

		editorViewModel.removeHoveredHandle();
		e.preventDefault();
		e.stopPropagation();
		editorViewModel.startMoveWire({ id: id, handleType: clickedHandle });
	}

	function onHandleEnter(handleType: HandleType) {
		if (
			uiState.editType != null &&
			uiState.editType != "move" &&
			uiState.editType != "add"
		) {
			return;
		}

		editorViewModel.setHoveredHandle({ handleType: handleType, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let deletingThis = $derived(
		uiState.editType == "delete" && uiState.editedId === id,
	);

	let stroke = $derived(deletingThis ? "red" : "black");
</script>

<path
	class="wire"
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	{stroke}
	style="pointer-events: none;"
></path>

<path
	role="button"
	tabindex="0"
	class="hitbox"
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="transparent"
	style="pointer-events: {uiState.editType === 'delete' ? 'all' : 'none'};"
	stroke-width="10"
	onmouseenter={() => {
		if (uiState.editType !== "delete") {
			return;
		}
		editorViewModel.setForDeletion(id);
	}}
	onmouseleave={() => {
		if (uiState.editType !== "delete") {
			return;
		}
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

<!-- Hide connected inputs -->
{#if input.connection === null}
	<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
	{#if !(!editingThis && uiState.draggedWire?.handleType === "input")}
		{@const isHoveredHandle =
			isWireConnection(uiState.hoveredHandle) &&
			uiState.hoveredHandle.id == id &&
			uiState.hoveredHandle.handleType == "input"}
		{@const hoveringOtherWire =
			!isHoveredHandle && uiState.hoveredHandle !== null}

		<!-- Highlight both handles when connecting two handles-->
		{@const draggingOtherOnToThis = isHoveredHandle && editingOtherWire}
		{@const draggingThisOnToOther = hoveringOtherWire && editingThis}
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
			r={isHoveredHandle || draggingThisOnToOther ? 10 : 5}
			fill={draggingOtherOnToThis || draggingThisOnToOther ? "purple" : "black"}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("input", e)}
		></circle>
	{/if}
{/if}
<!-- Hide outputs connected to components -->
{#if !(output.connection !== null && "handleId" in output.connection)}
	<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
	{#if !(!editingThis && uiState.draggedWire?.handleType === "output")}
		{@const isHoveredHandle =
			isWireConnection(uiState.hoveredHandle) &&
			uiState.hoveredHandle.id == id &&
			uiState.hoveredHandle.handleType == "output"}
		{@const hoveringOtherWire =
			!isHoveredHandle && uiState.hoveredHandle !== null}

		<!-- Highlight both handles when connecting two handles-->
		{@const draggingOtherOnToThis = isHoveredHandle && editingOtherWire}
		{@const draggingThisOnToOther = hoveringOtherWire && editingThis}
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
			r={isHoveredHandle || draggingThisOnToOther ? 10 : 5}
			fill={draggingOtherOnToThis || draggingThisOnToOther ? "purple" : "black"}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("output", e)}
		></circle>
	{/if}{/if}

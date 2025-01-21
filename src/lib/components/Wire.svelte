<script lang="ts">
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import { isComponentConnection, isWireConnection } from "$lib/util/global";
	import { simulation } from "$lib/util/simulation.svelte";
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

	let simulating = $derived(uiState.editMode === "simulate");
	let simData = $derived.by(() => simulation.getDataForComponent(id));

	let isPowered = $derived.by(() => {
		const isOutputPowered = simData?.outputs["output"] ?? false;
		return simulating && isOutputPowered;
	});

	function onHandleDown(clickedHandle: HandleType, e: MouseEvent) {
		if (uiState.editMode != null) {
			return;
		}
		if (e.button !== 0) {
			return;
		}

		editorViewModel.removeHoveredHandle();
		e.preventDefault();
		e.stopPropagation();
		const handle = clickedHandle === "input" ? input : output;
		editorViewModel.startMoveWire(
			{ id: id, handleType: clickedHandle },
			handle.connections.length,
		);
	}

	function onHandleEnter(handleType: HandleType) {
		if (
			uiState.editMode != null &&
			uiState.editMode != "move" &&
			uiState.editMode != "add"
		) {
			return;
		}

		editorViewModel.setHoveredHandle({ handleType: handleType, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let deletingThis = $derived(
		uiState.editMode == "delete" && uiState.hoveredElement === id,
	);

	let stroke = $derived(deletingThis || isPowered ? "red" : "black");
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
	style="pointer-events: {uiState.editMode === 'delete' ? 'all' : 'none'};"
	stroke-width="10"
	onmouseenter={() => {
		if (uiState.editMode !== "delete") {
			return;
		}
		editorViewModel.setHovered(id);
	}}
	onmouseleave={() => {
		if (uiState.editMode !== "delete") {
			return;
		}
		editorViewModel.removeHovered();
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
{#if input.connections.length === 0}
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

		{@const isHandlePowered = simData?.["inputs"]?.["input"] ?? false}
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
			fill={draggingOtherOnToThis || draggingThisOnToOther
				? "purple"
				: simulating && isHandlePowered
					? "red"
					: "black"}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("input", e)}
		></circle>
	{/if}
{/if}
<!-- Hide outputs connected to components -->
{#if !isComponentConnection(output.connections[0] ?? null)}
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

		{@const isHandlePowered = simData?.["outputs"]?.["output"] ?? false}
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
			fill={draggingOtherOnToThis || draggingThisOnToOther
				? "purple"
				: simulating && isHandlePowered
					? "red"
					: "black"}
			style="pointer-events: {editingThis ? 'none' : 'all'};"
			onmousedown={(e) => onHandleDown("output", e)}
		></circle>
	{/if}
{/if}

<style lang="scss">
	circle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
</style>

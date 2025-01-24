<script lang="ts">
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import { isComponentConnection } from "$lib/util/global";
	import { simulation } from "$lib/util/simulation.svelte";
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import Handle from "./Handle.svelte";

	type Props = {
		id: number;
		input: WireHandle;
		output: WireHandle;
		uiState: EditorUiState;
	};

	let { id, input, output, uiState }: Props = $props();

	let editingThis = $derived(uiState.draggedWire?.id === id);

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

	let stroke = $derived(
		deletingThis || isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)",
	);
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
	onpointerenter={() => {
		if (uiState.editMode !== "delete") {
			return;
		}
		editorViewModel.setHovered(id);
	}}
	onpointerleave={() => {
		if (uiState.editMode !== "delete") {
			return;
		}
		editorViewModel.removeHovered();
	}}
	onpointerdown={(e: MouseEvent) => {
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
		<Handle
			{uiState}
			connection={{
				id: id,
				handleType: "input",
			}}
			{editingThis}
			{simulating}
			{simData}
			handleType="input"
			position={{ x: input.x, y: input.y }}
			onHandleDown={(e) => onHandleDown("input", e)}
			onHandleEnter={() => onHandleEnter("input")}
			{onHandleLeave}
		/>
	{/if}
{/if}
<!-- Hide outputs connected to components -->
{#if !isComponentConnection(output.connections[0] ?? null)}
	<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
	{#if !(!editingThis && uiState.draggedWire?.handleType === "output")}
		<Handle
			{uiState}
			connection={{
				id: id,
				handleType: "output",
			}}
			{editingThis}
			{simulating}
			{simData}
			handleType="output"
			position={{ x: output.x, y: output.y }}
			onHandleDown={(e) => onHandleDown("output", e)}
			onHandleEnter={() => onHandleEnter("output")}
			{onHandleLeave}
		/>
	{/if}
{/if}

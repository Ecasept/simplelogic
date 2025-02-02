<script lang="ts">
	import {
		canvasViewModel,
		EditorAction,
		editorViewModel,
	} from "$lib/util/actions";
	import {
		calculateHandleOffset,
		calculateHandlePosition,
		GRID_SIZE,
	} from "$lib/util/global";
	import { simulation } from "$lib/util/simulation.svelte";
	import type {
		ComponentHandleList,
		ComponentType,
		HandleEdge,
		HandleType,
		SVGPointerEvent,
		XYPair,
	} from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import ComponentInner from "./ComponentInner.svelte";
	import Handle from "./Handle.svelte";

	type Props = {
		id: number;
		size: XYPair;
		type: ComponentType;
		position: XYPair;
		handles: ComponentHandleList;
		isPoweredInitially: boolean;
		uiState: EditorUiState;
	};
	let {
		id,
		size,
		type,
		position,
		handles,
		uiState,
		isPoweredInitially,
	}: Props = $props();

	let rect: SVGRectElement;

	let editingThis = $derived(uiState.editedId === id);

	let simulating = $derived(
		uiState.editMode === "simulate" ||
			uiState.prevState?.editMode === "simulate",
	);
	let simData = $derived.by(() => simulation.getDataForComponent(id));

	let isPowered = $derived.by(() => {
		const isAnyOutputPowered = Object.values(simData?.outputs ?? {}).some(
			(v) => v,
		);
		if (simulating) {
			if (isAnyOutputPowered) {
				return true;
			}
			if (type === "LED" && simData?.inputs["in"]) {
				// LED does not have output and is powered if input is true
				return true;
			}
		}
		if (isPoweredInitially) {
			return true;
		}
		return false;
	});

	let cursor = $derived.by(() => {
		if (editingThis) {
			if (uiState.editMode === "move") {
				return "grabbing";
			} else {
				return "default";
			}
		} else {
			if (uiState.editMode === null) {
				return "grab";
			} else {
				return "default";
			}
		}
	});

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: HandleEdge,
		handlePos: number,
		e: SVGPointerEvent,
	) {
		if (e.button !== 0) {
			return;
		}
		if (deletingThis) {
			EditorAction.deleteComponent(id);
			return;
		}
		if (uiState.editMode != null) {
			return;
		}
		e.preventDefault();
		e.currentTarget.releasePointerCapture(e.pointerId);

		editorViewModel.removeHoveredHandle();

		// calculate position of handle
		let handleOffset = calculateHandleOffset(handleEdge, handlePos, size);

		const wirePos = {
			x: position.x + handleOffset.x,
			y: position.y + handleOffset.y,
		};

		EditorAction.addWire(wirePos, handleType, {
			id: id,
			handleId: handleId,
		});
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) {
			return;
		}
		if (uiState.editMode == "delete") {
			EditorAction.deleteComponent(id);
			return;
		}
		if (uiState.editMode != null) {
			return;
		}

		e.preventDefault();
		// Calculate offset between click position and component origin
		const clickPos = canvasViewModel.clientToSVGCoords({
			x: e.clientX,
			y: e.clientY,
		});
		const offset = {
			x: clickPos.x - position.x,
			y: clickPos.y - position.y,
		};
		editorViewModel.startMoveComponent(id, offset);
	}

	function onHandleEnter(identifier: string) {
		if (
			uiState.editMode != null &&
			uiState.editMode != "move" &&
			uiState.editMode != "add" &&
			uiState.editMode != "delete" &&
			uiState.editMode != "simulate"
		) {
			return;
		}
		editorViewModel.setHoveredHandle({ handleId: identifier, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	// If we are in delete mode, and either
	// - this component is being hovered
	// - a handle of this component is being hovered
	let deletingThis = $derived(
		uiState.editMode == "delete" &&
			(uiState.hoveredElement === id || uiState.hoveredHandle?.id === id),
	);

	let fill = $derived(
		deletingThis
			? "var(--component-delete-color)"
			: "var(--component-background-color)",
	);

	let width = $derived(size.x * GRID_SIZE);
	let height = $derived(size.y * GRID_SIZE);

	let stroke = $derived(
		isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)",
	);
</script>

<rect
	bind:this={rect}
	role="button"
	tabindex="0"
	aria-label={type}
	class="component-body"
	data-testcomponenttype={type}
	data-testcomponentid={id}
	x={position.x}
	y={position.y}
	{width}
	{height}
	style="cursor: {cursor}"
	onpointerdown={onPointerDown}
	onpointerenter={() => {
		editorViewModel.setHoveredElement(id);
	}}
	onpointerleave={() => {
		editorViewModel.removeHoveredElement();
	}}
	{fill}
	{stroke}
	fill-opacity="70%"
/>

<ComponentInner
	componentId={id}
	x={position.x}
	y={position.y}
	{width}
	{height}
	{type}
	{isPowered}
	editMode={uiState.editMode}
/>

{#each Object.entries(handles) as [identifier, handle]}
	<!-- Hide connected inputs -->
	{#if !(handle.connections.length !== 0 && handle.type === "input")}
		<!-- Hide handles of same type as dragged handle -->
		{#if !(uiState.draggedWire?.handleType === handle.type)}
			<!-- Hide inputs if the dragged wire already has outgoing wires
			 (wire outputs may only be connected to either 1 component input, or multiple wire inputs) -->
			{#if !(uiState.draggedWire?.handleType === "output" && (uiState.draggedWireConnectionCount ?? 0) > 0)}
				<Handle
					{uiState}
					connection={{
						id: id,
						handleId: identifier,
					}}
					{editingThis}
					{deletingThis}
					{simulating}
					{simData}
					handleType={handle.type}
					position={calculateHandlePosition(
						position,
						handle.edge,
						handle.pos,
						size,
					)}
					onHandleDown={(e) =>
						onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
					onHandleEnter={() => onHandleEnter(identifier)}
					{onHandleLeave}
				/>
			{/if}
		{/if}
	{/if}
{/each}

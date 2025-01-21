<script lang="ts">
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import {
		calculateHandleOffset,
		GRID_SIZE,
		isComponentConnection,
	} from "$lib/util/global";
	import { simulation } from "$lib/util/simulation.svelte";
	import type {
		ComponentHandleList,
		ComponentType,
		HandleEdge,
		HandleType,
		XYPair,
	} from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import ComponentInner from "./ComponentInner.svelte";

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
	let editingOtherWire = $derived(uiState.draggedWire?.id != null);

	let simulating = $derived(uiState.editType === "simulate");
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
			if (uiState.editType === "move") {
				return "grabbing";
			} else {
				return "default";
			}
		} else {
			if (uiState.editType === null) {
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
		e: MouseEvent,
	) {
		if (uiState.editType != null) {
			return;
		}
		if (e.button !== 0) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		editorViewModel.removeHoveredHandle();

		// calculate position of handle
		let handleOffset = calculateHandleOffset(handleEdge, handlePos, size);

		EditorAction.addWire(position, handleOffset, handleType, {
			id: id,
			handleId: handleId,
		});
	}

	function onMouseDown(e: MouseEvent) {
		if (uiState.editType == "delete") {
			EditorAction.deleteComponent(id);
			return;
		}
		if (e.button !== 0) {
			return;
		}
		if (uiState.editType != null) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		const dim = rect.getBoundingClientRect();
		const offset = {
			x: e.clientX - (dim?.x ?? 0),
			y: e.clientY - (dim?.y ?? 0),
		};
		editorViewModel.startMoveComponent(id, offset);
	}

	function onHandleEnter(identifier: string) {
		if (
			uiState.editType != null &&
			uiState.editType != "move" &&
			uiState.editType != "add"
		) {
			return;
		}
		editorViewModel.setHoveredHandle({ handleId: identifier, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let deletingThis = $derived(
		uiState.editType == "delete" && uiState.hoveredElement === id,
	);

	let fill = $derived(deletingThis ? "red" : "green");

	let width = $derived(size.x * GRID_SIZE);
	let height = $derived(size.y * GRID_SIZE);

	let stroke = $derived(isPowered ? "red" : "black");
</script>

<rect
	bind:this={rect}
	role="button"
	tabindex="0"
	aria-label={type}
	class="component-body"
	x={position.x}
	y={position.y}
	{width}
	{height}
	style="cursor: {cursor}"
	onmousedown={onMouseDown}
	onmouseenter={() => {
		editorViewModel.setHovered(id);
	}}
	onmouseleave={() => {
		editorViewModel.removeHovered();
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
	editType={uiState.editType}
/>

{#each Object.entries(handles) as [identifier, handle]}
	<!-- Hide connected inputs -->
	{#if !(handle.connections.length !== 0 && handle.type === "input")}
		<!-- Hide handles of same type as dragged handle -->
		{#if !(uiState.draggedWire?.handleType === handle.type)}
			<!-- Hide inputs if the dragged wire already has outgoing wires
			 (wire outputs may only be connected to either 1 component input, or multiple wire inputs) -->
			{#if !(uiState.draggedWire?.handleType === "output" && (uiState.draggedWireConnectionCount ?? 0) > 0)}
				{@const isHoveredHandle =
					isComponentConnection(uiState.hoveredHandle) &&
					uiState.hoveredHandle.id == id &&
					uiState.hoveredHandle.handleId == identifier}
				{@const isHandlePowered =
					simData?.[handle.type === "input" ? "inputs" : "outputs"]?.[
						identifier
					] ?? false}
				<circle
					role="button"
					tabindex="0"
					class="handle {handle.edge}"
					onmouseenter={() => {
						onHandleEnter(identifier);
					}}
					onmouseleave={onHandleLeave}
					cx={position.x +
						calculateHandleOffset(handle.edge, handle.pos, size).x}
					cy={position.y +
						calculateHandleOffset(handle.edge, handle.pos, size).y}
					r={isHoveredHandle ? 10 : 5}
					fill={isHoveredHandle && editingOtherWire
						? "purple"
						: simulating && isHandlePowered
							? "red"
							: "black"}
					onmousedown={(e) =>
						onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
				></circle>
			{/if}
		{/if}
	{/if}
{/each}

<style lang="scss">
	circle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
</style>

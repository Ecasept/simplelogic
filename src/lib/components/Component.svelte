<script lang="ts">
	import { calculateHandleOffset, GRID_SIZE } from "$lib/util/global";
	import type {
		ComponentHandleList,
		HandleType,
		HandleEdge,
		XYPair,
	} from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import ComponentInner from "./ComponentInner.svelte";

	type Props = {
		id: number;
		size: XYPair;
		type: string;
		position: XYPair;
		connections: ComponentHandleList;
		uiState: EditorUiState;
	};
	let { id, size, type, position, connections, uiState }: Props = $props();

	let rect: SVGRectElement;

	let editingThis = $derived(uiState.editedId === id);
	let editing = $derived(uiState.editType !== null);
	let simulating = $derived(uiState.editType === "simulate");

	let cursor = $derived.by(() => {
		if (editingThis) {
			if (uiState.editType === "add") {
				return "default";
			} else if (uiState.editType === "move") {
				return "grabbing";
			}
		} else {
			if (editing) {
				return "default";
			} else {
				return "grab";
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
		if (uiState.editType != null) {
			return;
		}
		editorViewModel.setHoveredHandle({ handleId: identifier, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let hoverR = $state(5);
	let hoveredHandle: string | null = $state(null);
	let handleFill = $state("black");
	$effect(() => {
		if (editing && !uiState.outputConnectedToWire) {
			// Adding/moving something else
			handleFill = "purple";
		} else if (!uiState.outputConnectedToWire) {
			// Not adding/moving anything
			hoverR = 10;
			handleFill = "black";
		} else {
			hoverR = 5;
			handleFill = "black";
		}
		if (
			uiState.hoveredHandle !== null &&
			id === uiState.hoveredHandle.id &&
			"handleId" in uiState.hoveredHandle
		) {
			hoveredHandle = uiState.hoveredHandle.handleId;
		} else {
			hoveredHandle = null;
		}
	});

	let fill = $derived.by(() => {
		if (uiState.editType == "delete" && editingThis) {
			return "red";
		} else {
			return "green";
		}
	});

	let width = $derived(size.x * GRID_SIZE);
	let height = $derived(size.y * GRID_SIZE);
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
		editorViewModel.setForDeletion(id);
	}}
	onmouseleave={() => {
		editorViewModel.removeForDeletion();
	}}
	{fill}
	stroke="black"
	fill-opacity="70%"
/>

<ComponentInner
	x={position.x}
	y={position.y}
	{width}
	{height}
	{type}
	{simulating}
/>

{#each Object.entries(connections) as [identifier, handle]}
	{#if !(handle.connection !== null && handle.type === "input")}
		<!-- Hide connected inputs -->
		{#if !(uiState.draggedHandle === handle.type)}
			<!-- Hide handles of same type as dragged handle -->
			<circle
				role="button"
				tabindex="0"
				class="handle {handle.edge}"
				onmouseenter={() => {
					onHandleEnter(identifier);
				}}
				onmouseleave={onHandleLeave}
				cx={position.x + calculateHandleOffset(handle.edge, handle.pos, size).x}
				cy={position.y + calculateHandleOffset(handle.edge, handle.pos, size).y}
				r={hoveredHandle === identifier ? hoverR : 5}
				fill={hoveredHandle === identifier ? handleFill : "black"}
				onmousedown={(e) =>
					onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
			></circle>
		{/if}
	{/if}
{/each}

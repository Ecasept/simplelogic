<script lang="ts">
	import { calculateHandleOffset, GRID_SIZE } from "$lib/util/global";
	import type {
		ComponentHandleList,
		HandleType,
		HandleEdge,
		XYPair,
	} from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import {
		ChangesAction,
		EditorAction,
		editorViewModel,
	} from "$lib/util/actions";

	export let id: number;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let connections: ComponentHandleList;

	export let uiState: EditorUiState;

	let rect: SVGRectElement;

	$: editingThis = uiState.editedId === id;
	$: editing = uiState.editType !== null;

	let cursor = "default";
	$: {
		if (editingThis) {
			if (uiState.editType === "add") {
				cursor = "default";
			} else {
				// uiState = "move"
				cursor = "grabbing";
			}
		} else {
			if (editing) {
				cursor = "default";
			} else {
				cursor = "grab";
			}
		}
	}

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: HandleEdge,
		handlePos: number,
		e: MouseEvent,
	) {
		if (uiState.isModalOpen || editing) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		editorViewModel.removeHoveredHandle();

		// calculate position of handle
		let handleOffset = calculateHandleOffset(handleEdge, handlePos, size);

		EditorAction.addWire(
			{
				label: "test",
			},
			position,
			handleOffset,
			handleType,
			{ id: id, handleId: handleId },
		);
	}

	function onMouseDown(e: MouseEvent) {
		if (uiState.isModalOpen || editing) {
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
		editorViewModel.setHoveredHandle({ handleId: identifier, id: id });
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
			"handleId" in uiState.hoveredHandle
		) {
			hoveredHandle = uiState.hoveredHandle.handleId;
		} else {
			hoveredHandle = null;
		}
		console.log(hoverR);
		console.log(!uiState.outputConnectedToWire);
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<rect
	bind:this={rect}
	class="component-body"
	x={position.x}
	y={position.y}
	width={size.x * GRID_SIZE}
	height={size.y * GRID_SIZE}
	style="cursor: {cursor}"
	on:mousedown={onMouseDown}
	fill="green"
	stroke="black"
	fill-opacity="70%"
>
</rect>

{#each Object.entries(connections) as [identifier, handle]}
	{#if !(handle.connection !== null && handle.type === "input")}
		<!-- Hide connected inputs -->
		{#if !(uiState.draggedHandle === handle.type)}
			<!-- Hide handles of same type as dragged handle -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<circle
				class="handle {handle.edge}"
				on:mouseenter={() => {
					onHandleEnter(identifier);
				}}
				on:mouseleave={onHandleLeave}
				cx={position.x + calculateHandleOffset(handle.edge, handle.pos, size).x}
				cy={position.y + calculateHandleOffset(handle.edge, handle.pos, size).y}
				r={hoveredHandle === identifier ? hoverR : 5}
				on:mousedown={(e) =>
					onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
			></circle>
		{/if}
	{/if}
{/each}

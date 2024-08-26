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

	$: editingThis = uiState.id === id;
	$: editing = uiState.state !== null;

	$: cursor = editingThis
		? uiState.state === "add"
			? "default"
			: "grabbing"
		: "grab";

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

	function onHandleEnter(e: MouseEvent) {
		if (uiState.isModalOpen) {
			return;
		}
		if (e.target === null) {
			console.error("e.target is null, can't highlight wire handle.");
			return;
		}
		if (!(e.target instanceof Element)) {
			console.error("e.target is not an element, can't highlight wire handle");
			return;
		}
		e.target.setAttribute("r", "10");
	}

	function onHandleLeave(e: MouseEvent) {
		if (e.target === null) {
			console.error("e.target is null, can't dehighlight wire handle.");
			return;
		}
		if (!(e.target instanceof Element)) {
			console.error(
				"e.target is not an element, can't dehighlight wire handle",
			);
			return;
		}
		e.target.setAttribute("r", "5");
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
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<circle
			class="handle {handle.edge}"
			on:mouseenter={onHandleEnter}
			on:mouseleave={onHandleLeave}
			cx={position.x + calculateHandleOffset(handle.edge, handle.pos, size).x}
			cy={position.y + calculateHandleOffset(handle.edge, handle.pos, size).y}
			r="5"
			on:mousedown={(e) =>
				onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
			data-type={handle.type}
			data-has-connection={handle.connection !== null}
		></circle>
	{/if}
{/each}

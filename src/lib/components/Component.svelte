<script lang="ts">
	import {
		calculateHandleOffset,
		GRID_SIZE,
		isClickOverSidebar,
	} from "$lib/util/global";
	import type {
		ComponentHandleList,
		HandleType,
		HandleEdge,
		XYPair,
	} from "$lib/util/types";
	import {
		editorViewModel,
		type EditorUiState,
	} from "$lib/util/viewModels/editorViewModel";

	export let id: number;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let connections: ComponentHandleList;

	export let uiState: EditorUiState;

	$: addingThis = id === uiState.addingId;
	$: movingThis = id === uiState.movingId;

	$: cursor = addingThis ? "default" : movingThis ? "grabbing" : "grab";

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: HandleEdge,
		handlePos: number,
		e: MouseEvent,
	) {
		if (addingThis || movingThis) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		// calculate position of handle
		let handleOffset = calculateHandleOffset(handleEdge, handlePos, size);

		editorViewModel.addWire(
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
		if (addingThis || movingThis) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		editorViewModel.startMoveComponent(id);
	}

	function onMouseMove(e: MouseEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}

		editorViewModel.moveComponentReplaceable(
			size,
			position,
			{
				x: e.clientX,
				y: e.clientY,
			},
			id,
		);
	}

	function onMouseUp(e: MouseEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}
		if (addingThis && isClickOverSidebar(e)) {
			return;
		}
		editorViewModel.applyChanges();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}
		if (e.key === "Escape") {
			editorViewModel.cancelChanges();
		}
	}

	function onHandleEnter(e: MouseEvent) {
		if (uiState.addingId !== null || uiState.movingId !== null) {
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

<svelte:window
	on:keydown={onKeyDown}
	on:mousemove={onMouseMove}
	on:mouseup={onMouseUp}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<rect
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

<script lang="ts">
	import { GRID_SIZE, gridSnap, isClickOverSidebar } from "$lib/util/global";
	import { viewModel, type UiState } from "$lib/util/graph";
	import type {
		ComponentHandleList,
		HandleType,
		HandleEdge,
		XYPair,
	} from "$lib/util/types";

	export let id: number;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let connections: ComponentHandleList;

	export let uiState: UiState;

	$: addingThis = id === uiState.addingId;
	$: movingThis = id === uiState.movingId;

	$: cursor = addingThis ? "default" : movingThis ? "grabbing" : "grab";

	function calculateHandleOffset(
		handleEdge: HandleEdge,
		handlePos: number,
		componentSize: XYPair,
	) {
		let pos: XYPair = { x: 0, y: 0 };
		if (["left", "right"].includes(handleEdge)) {
			pos.x = handleEdge == "right" ? GRID_SIZE * componentSize.x : 0;
			pos.y = GRID_SIZE * handlePos;
		} else {
			pos.x = GRID_SIZE * handlePos;
			pos.y = handleEdge == "bottom" ? GRID_SIZE * componentSize.y : 0;
		}
		return pos;
	}

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: HandleEdge,
		handlePos: number,
		e: MouseEvent,
	) {
		e.preventDefault();

		if (addingThis || movingThis) {
			return;
		}

		// calculate position of handle
		let handleOffset = calculateHandleOffset(handleEdge, handlePos, size);

		viewModel.addWire(
			{
				label: "test",
				input: {
					x: position.x + handleOffset.x,
					y: position.y + handleOffset.y,
					connection: null,
				},
				output: {
					x: position.x + handleOffset.x,
					y: position.y + handleOffset.y,
					connection: null,
				},
			},
			handleType,
			{ id: id, handleId: handleId },
		);
	}

	function onMouseDown(e: MouseEvent) {
		if (addingThis) {
			return;
		}
		console.log(e);

		e.preventDefault();
		viewModel.startMoveComponent(id, { x: e.offsetX, y: e.offsetY });
	}

	function onMouseMove(e: MouseEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}

		const newX = gridSnap(e.clientX - (uiState.mouseOffset?.x ?? 0));
		const newY = gridSnap(e.clientY - (uiState.mouseOffset?.y ?? 0));
		if (newX === position.x && newY === position.y) {
			return;
		}
		viewModel.moveComponentReplaceable(
			{
				x: newX,
				y: newY,
			},
			id,
		);
	}

	function onMouseUp(e: MouseEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}
		if (isClickOverSidebar(e)) {
			return;
		}
		viewModel.applyChanges();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!(addingThis || movingThis)) {
			return;
		}
		if (e.key === "Escape") {
			viewModel.cancelChanges();
		}
	}

	function onHandleEnter(e: MouseEvent) {
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

<svelte:window on:keydown={onKeyDown} on:mousemove={onMouseMove} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<rect
	class="component-body"
	x={position.x}
	y={position.y}
	width={size.x * GRID_SIZE}
	height={size.y * GRID_SIZE}
	style="cursor: {cursor}"
	on:mousedown={onMouseDown}
	on:mouseup={onMouseUp}
>
</rect>

{#each Object.entries(connections) as [identifier, handle]}
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
{/each}

<style lang="scss">
	.wrapper {
		--border-size: 2px;
		border: black var(--border-size) solid;
		cursor: grabbing;
		z-index: 1;

		&:not(.grabbed) {
			cursor: grab;
		}

		&:hover {
			.handle:not([data-type="input"][data-has-connection="true"]) {
				display: block;
			}
		}

		.contentWrapper {
			height: 100%;
			width: 100%;
			position: absolute;
			top: 0;
		}

		.handle {
			display: none;
			width: 10px;
			height: 10px;
			padding: 10px;

			&:hover {
				width: 20px;
				height: 20px;
				padding: 5px;
			}

			div {
				height: 100%;
				width: 100%;
				background-color: black;
				border-radius: 100%;
			}

			&.top {
				position: absolute;
				top: -16px;
				left: calc(var(--grid-size) * (var(--pos)));
				transform: translate(-50%);
			}

			&.right {
				position: absolute;
				right: -16px;
				top: calc(var(--grid-size) * (var(--pos)));
				transform: translateY(-50%);
			}

			&.bottom {
				position: absolute;
				bottom: -16px;
				left: calc(var(--grid-size) * (var(--pos)));
				transform: translate(-50%);
			}

			&.left {
				position: absolute;
				left: -16px;
				top: calc(var(--grid-size) * (var(--pos)));
				transform: translateY(-50%);
			}
		}
	}
</style>

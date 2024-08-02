<script lang="ts">
	import { GRID_SIZE, gridSnap, isClickOverSidebar } from "$lib/util/global";
	import { viewModel, type UiState } from "$lib/util/graph";
	import type {
		ComponentHandleList,
		HandleType,
		Edge,
		XYPair,
	} from "$lib/util/types";

	export let id: number;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let connections: ComponentHandleList;
	$: height = size.y;
	$: width = size.x;

	export let uiState: UiState;

	$: addingThis = id === uiState.addingId;
	$: movingThis = id === uiState.movingId;

	$: cursor = addingThis ? "default" : movingThis ? "grabbing" : "grab";

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: Edge,
		handlePos: number,
		e: MouseEvent,
	) {
		e.preventDefault();

		if (addingThis || movingThis) {
			return;
		}

		// calculate position of handle
		let x, y;
		if (["left", "right"].includes(handleEdge)) {
			x = position.x + (handleEdge == "right" ? GRID_SIZE * width : 0);
			y = position.y + GRID_SIZE * handlePos;
		} else {
			x = position.x + GRID_SIZE * handlePos;
			y = position.y + (handleEdge == "bottom" ? GRID_SIZE * height : 0);
		}

		viewModel.addWire(
			{
				label: "test",
				input: {
					x: x,
					y: y,
					connection: null,
				},
				output: {
					x: x,
					y: y,
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
</script>

<svelte:window on:keydown={onKeyDown} on:mousemove={onMouseMove} />

<div
	class="wrapper"
	style="--x: {position.x}px; --y: {position.y}px; --width: {width}; --height: {height}; cursor: {cursor}"
>
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="contentWrapper" on:mousedown={onMouseDown} on:mouseup={onMouseUp}>
		{label} &centerdot; {type} &centerdot; id: {id}
	</div>
	{#each Object.entries(connections) as [identifier, handle]}
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="handle {handle.edge}"
			on:mousedown={(e) =>
				onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
			style="--pos: {handle.pos}"
			title={identifier}
			data-type={handle.type}
			data-has-connection={handle.connection !== null}
		>
			<div />
		</div>
	{/each}
</div>

<style lang="scss">
	.wrapper {
		--border-size: 2px;
		height: calc((var(--height)) * var(--grid-size) - var(--border-size));
		width: calc((var(--width)) * var(--grid-size) - var(--border-size));
		position: absolute;
		top: var(--y);
		left: var(--x);
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

<script lang="ts">
    import { GRID_SIZE, gridSnap } from '$lib/util/global';
	import { executeCommand, SetComponentPositionCommand } from '$lib/util/graph';
    import type { AddWireEvent, ComponentIOList, XYPair } from '$lib/util/types';
	import { createEventDispatcher } from 'svelte';
	import Wire from './Wire.svelte';

	export let id: number;
	export let label: string = 'Component';
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let inputs: ComponentIOList;
	export let outputs: ComponentIOList;
	let height = size.y;
	let width = size.x;

	let wrapper: HTMLDivElement;

	let mouseOffset: {x: number, y: number} | null;
	let grabbing = false;
	$: cursor = grabbing ? 'grabbing' : 'grab';

	const dispatch = createEventDispatcher<{addWire: AddWireEvent}>()

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();

		mouseOffset = {x: e.offsetX, y: e.offsetY};
		grabbing = true;

		window.addEventListener("mousemove", updatePosition);
		window.addEventListener("mouseup", setPosition);
	}

	function handleDown(type: string, edge: string, handleIndex: number, e: MouseEvent) {
		e.preventDefault();

		// calculate position of handle
		let x, y;
		if(["left", "right"].includes(edge)) {
			x = position.x + (edge == "right" ? (GRID_SIZE * width) : 0)
			y = position.y + (GRID_SIZE * (handleIndex + 1))
		} else {
			x = position.x + (GRID_SIZE * (handleIndex + 1));
			y = position.y + (edge == "bottom" ? (GRID_SIZE * height) : 0)
		}

		dispatch("addWire", {
			label: 'test',
			input: {
				x: x,
				y: y,
				// if the handle was an output handle, the input of the new wire will be this component
				id: type === "output" ? id : -1,
			},
			output: {
				x: x,
				y: y,
				id: type === "input" ? id : -1,
			},
		})
	}


	function updatePosition(e: MouseEvent) {
		position.x = e.clientX - (mouseOffset?.x ?? 0);
		position.y = e.clientY - (mouseOffset?.y ?? 0);
	}

	function setPosition(e: MouseEvent) {
		const cmd = new SetComponentPositionCommand(
			{
				x: gridSnap(e.clientX - (mouseOffset?.x ?? 0)),
				y: gridSnap(e.clientY - (mouseOffset?.y ?? 0))
			},
			id,
		);
		executeCommand(cmd);

		mouseOffset = null;
		grabbing = false;

		window.removeEventListener("mousemove", updatePosition);
		window.removeEventListener("mouseup", setPosition);
	}
</script>


<div id={id.toString()} class="wrapper" bind:this={wrapper}
		 style="--x: {position.x}px; --y: {position.y}px; --width: {width}; --height: {height}; cursor: {cursor}">
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="contentWrapper" on:mousedown={onCmpDown}>
		{label} &centerdot; {type} &centerdot; id: {id}
	</div>
	{#each Object.entries(inputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="handle {position}" on:mousedown={(e) => handleDown("input", position, i, e)}
					 style="--num: {handles.length}; --index: {i}" title={handle.type}>
				<div />
			</div>
		{/each}
	{/each}
	{#each Object.entries(outputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="handle {position}" on:mousedown={(e) => handleDown("output", position, i, e)}
					 style="--num: {handles.length}; --index: {i}" title={handle.type}>
				<div />
			</div>
		{/each}
	{/each}
</div>

<style lang="scss">
	.wrapper {
		height: calc((var(--height, 0)) * var(--grid-size) - 2px);
		width: calc((var(--width, 0)) * var(--grid-size) - 2px);
		position: absolute;
		top: var(--y);
		left: var(--x);
		border: black 2px solid;
		cursor: grabbing;

		&:not(.grabbed) {
			cursor: grab;
		}

		&:hover {
			.handle {
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
			z-index: 1;
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
				left: calc(var(--grid-size) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.right {
				position: absolute;
				right: -16px;
				top: calc(var(--grid-size) * (var(--index) + 1));
				transform: translateY(-50%);
			}

			&.bottom {
				position: absolute;
				bottom: -16px;
				left: calc(var(--grid-size) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.left {
				position: absolute;
				left: -16px;
				top: calc(var(--grid-size) * (var(--index) + 1));
				transform: translateY(-50%);
			}
		}
	}
</style>

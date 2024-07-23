<script lang="ts">
    import { GRID_SIZE } from '$lib/util/global';
    import type { ComponentIOList, handleDownEvent, componentDownEvent } from '$lib/util/types';
	import { createEventDispatcher } from 'svelte';

	export let id: number;
	export let label: string = 'Component';
	export let size: {x: number, y: number};
	export let type: string;
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	export let inputs: ComponentIOList;
	export let outputs: ComponentIOList;
	let absolutePosition: { x: number, y: number } = { x: position.x, y: position.y };
	let height = size.y;
	let width = size.x;

	let wrapper: HTMLDivElement;
	let grabbed: boolean = false;
	const dispatch = createEventDispatcher<{
		componentDown: ComponentDownEvent,
		handleDown: HandleDownEvent
	}>();

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();
		dispatch('componentDown', {
			id: id,
			component: this,
			mouseOffset: { x: e.offsetX, y: e.offsetY },
			updatePosition: updatePosition
		});
	}

	function handleDown(pos: string, handleIndex: number, e: MouseEvent) {
		e.preventDefault();
		dispatch('handleDown', {
			pos: pos,
			handleIndex: handleIndex,
			id: id
		});
	}


	function updatePosition(x: number, mouseStartOffsetX: number, y: number, mouseStartOffsetY: number) {
		absolutePosition.x = x - mouseStartOffsetX;
		absolutePosition.y = y - mouseStartOffsetY;
		position.x = Math.round(absolutePosition.x / GRID_SIZE) * GRID_SIZE;
		position.y = Math.round(absolutePosition.y / GRID_SIZE) * GRID_SIZE;
		wrapper.style.left = String(position.x) + 'px';
		wrapper.style.top = String(position.y) + 'px';
	}
</script>


<div id={id.toString()} class="wrapper" bind:this={wrapper}
		 style="--x: {position.x}px; --y: {position.y}px; --width: {width}; --height: {height}">
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="contentWrapper" on:mousedown={onCmpDown}>
		<p>{label}</p>
		{id}
	</div>
	{#each Object.entries(inputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="handle {position}" on:mousedown={(e) => handleDown(position, i, e)}
					 style="--num: {handles.length}; --index: {i}" title={handle.type}>
				<div />
			</div>
		{/each}
	{/each}
	{#each Object.entries(outputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="handle {position}" on:mousedown={(e) => handleDown(position, i, e)}
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
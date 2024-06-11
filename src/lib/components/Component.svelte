<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id;
	export let label: string = 'Component';
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	let absolutePosition: { x: number, y: number } = { x: position.x, y: position.y };
	let inputs;
	let outputs;

	let wrapper: HTMLDivElement;
	let grabbed: boolean = false;
	const dispatch = createEventDispatcher();

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();
		dispatch('componentDown', {
			id: id,
			component: this,
			mouseOffset: {x: e.offsetX, y: e.offsetY},
			updatePosition: updatePosition
		});
	}

	export let gridSize = 50;
	function updatePosition(x, y) {
		absolutePosition.x = x;
		absolutePosition.y = y;
		position.x = Math.round(absolutePosition.x / gridSize) * gridSize;
		position.y = Math.round(absolutePosition.y / gridSize) * gridSize;
		wrapper.style.left = String(position.x) + 'px';
		wrapper.style.top = String(position.y) + 'px';
	}
</script>

<div id={id} class="wrapper" on:mousedown={onCmpDown} bind:this={wrapper} style="--x: {position.x}px; --y: {position.y}px">
	<p>{label}</p>
	{id}
</div>

<style lang="scss">
	.wrapper {
		height: 198px;
		width: 198px;
		position: absolute;
		top: var(--y);
		left: var(--x);
		border: black 2px solid;
		cursor: grabbing;

		&:not(.grabbed) {
			cursor: grab;
		}
	}
</style>
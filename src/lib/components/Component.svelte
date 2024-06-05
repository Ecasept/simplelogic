<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export const label: string = 'Component';
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	let inputs;
	let outputs;

	let wrapper: HTMLDivElement;
	let grabbed: boolean = false;
	const dispatch = createEventDispatcher();

	function onCmpDown(e) {
		e.preventDefault();
		dispatch('componentDown', {
			component: this,
			callback: updatePosition
		});
	}

	function updatePosition(x, y) {
		position.x += x;
		position.y += y;
		wrapper.style.left = String(position.x) + 'px';
		wrapper.style.top = String(position.y) + 'px';
	}
</script>

<div class="wrapper" on:mousedown={onCmpDown} bind:this={wrapper}>
	<p>{label}</p>
</div>

<style lang="scss">
	.wrapper {
		height: 200px;
		width: 200px;
		position: absolute;
		top: 0;
		left: 0;
		border: black 2px solid;
		cursor: grabbing;

		&:not(.active) {
			cursor: grab;
		}
	}
</style>
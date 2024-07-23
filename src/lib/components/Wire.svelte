<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id;
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	let absolutePosition: { x: number, y: number } = { x: position.x, y: position.y };
	export let points: { x: number, y: number }[] = [];
	let inputs = [0];
	let outputs = [1];

	let wrapper: HTMLDivElement;
	let grabbed: boolean = false;
	let innerWidth = 0;
	let innerHeight = 0;
	const dispatch = createEventDispatcher();

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();
		dispatch('componentDown', {
			id: id,
			component: this,
			mouseOffset: { x: e.offsetX, y: e.offsetY },
			updatePosition: updatePosition
		});
	}

	function handleDown(pos, e) {
		e.preventDefault();
		dispatch('handleDown', {
			pos: pos,
			component: this
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

<svelte:window bind:innerHeight bind:innerWidth></svelte:window>

<div id={id} class="wrapper" bind:this={wrapper} style="--x: {position.x}px; --y: {position.y}px">
	<svg viewBox="0 0 -{innerHeight} -{innerWidth}" xmlns="http://www.w3.org/2000/svg" stroke-width="2px">
		<path d="{points.map((c, i) => i ? `${c.x+1} ${c.y+1}` : `M${c.x+1} ${c.y+1}`).join(' ')}" stroke="black" fill="none"></path>
	</svg>
</div>

<style lang="scss">
	.wrapper {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;

		svg {
			height: 100vh;
			width: 100vw;
		}
	}
</style>
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id;
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	let absolutePosition: { x: number, y: number } = { x: position.x, y: position.y };
	export let points: { x: number, y: number }[] = [];
	let inputs = [];
	let outputs = [];

	let inputHandle;
	let outputHandle;
	let handleVisible = false;
	const dispatch = createEventDispatcher();

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();
		dispatch('componentDown', {
			id: id,
			component: this,
			mouseOffset: { x: e.offsetX, y: e.offsetY },
			updatePosition: undefined
		});
	}

	function handleDown(pos, e) {
		e.preventDefault();
		dispatch('handleDown', {
			pos: pos,
			component: this
		});
	}

	function hover(e) {
		handleVisible = true;
	}
</script>

<path d="{points.map((c, i) => i ? `${c.x+1} ${c.y+1}` : `M${c.x+1} ${c.y+1}`).join(' ')}" stroke="black"
			fill="none" on:mouseover={hover}></path>
{#if inputs.length === 0}
	<foreignObject>
		<div class="handle" class:handleVisible={"visible"} on:mousedown={(e) => handleDown(position, i, e)}>
			<div />
		</div>
	</foreignObject>
{/if}
{#if outputs.length === 0}
	<foreignObject x="20" y="20" width="10" height="10">
		<div class="handle" class:handleVisible={"visible"} on:mousedown={(e) => handleDown(position, i, e)}>
			<div />
		</div>
	</foreignObject>
{/if}

<style lang="scss">
	path {
		margin: 10vh;
	}

	.handle {
		display: none;
		z-index: 1;
		width: 10px;
		height: 10px;
		padding: 10px;

		:global(.visible) {
			display: block;
		}

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
	}
</style>
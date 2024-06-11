<script lang="ts">
	import Component from '$lib/components/Component.svelte';

	let gridSize = 50;
	let updatePosition: ((x: number, y: number) => void) | null = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let components: { label: string, position: { x: number, y: number } }[] = [];
	let canvas: HTMLDivElement;
	let mouseStartOffset = { x: 0, y: 0 };

	function onCmpDown(e) {
		grabbedCmp = e.detail.component;
		updatePosition = e.detail.updatePosition;
		grabbedCmp?.classList.add('grabbed');
		mouseStartOffset = e.detail.mouseOffset;
	}

	function onMouseMove(e: MouseEvent) {
		if (updatePosition === null) return;
		updatePosition(e.clientX - mouseStartOffset.x, e.clientY - mouseStartOffset.y);
	}

	function onMouseUp(e) {
		grabbedCmp?.classList.remove('grabbed');
		grabbedCmp = null;
		updatePosition = null;
	}

	export function addCmp(cmp) {
		let newCmp = { label: 'test', position: { x: 400, y: 200 } };
		components = [...components, newCmp];
	}
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each components as { label, position }, id}
		<Component {id} {label} {position} on:componentDown={onCmpDown}></Component>
	{/each}
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100vw;
		height: 100vh;
		background-size: 50px 50px;
		background-position: -24px -24px;
		background-image: radial-gradient(circle, #000000 1px, rgba(0, 0, 0, 0) 1px);

	}
</style>
<script lang="ts">
	import Component from '$lib/components/Component.svelte';

	let callback = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let components: { label: string, position: { x: number, y: number } }[] = [];
	let canvas: HTMLDivElement;

	function onCmpDown(e) {
		grabbedCmp = e.detail.component;
		callback = e.detail.callback;
		grabbedCmp?.classList.add('grabbed');
	}

	function onMouseMove(e) {
		if (callback === null) return;
		callback(e.movementX, e.movementY);
	}

	function onMouseUp() {
		grabbedCmp?.classList.remove('grabbed');
		grabbedCmp = null;
		callback = null;
	}

	export function addCmp(cmp) {
		let newCmp = { label: 'test', position: { x: 0, y: 0 } };
		components.push(newCmp);
		components = components;
	}
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each components as { label, position }}
		<Component {label} {position} on:componentDown={onCmpDown}></Component>
	{/each}
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100vw;
		height: 100vh;
	}
</style>
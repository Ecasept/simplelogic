<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	let callback = null;
	let grabbedCmp: HTMLDivElement | null = null;

	function onCmpDown(e) {
		grabbedCmp = e.detail.component;
		callback = e.detail.callback;
		grabbedCmp?.classList.add("active");
	}

	function onMouseMove(e) {
		if(callback === null) return;
		callback(e.movementX, e.movementY)
	}

	function onMouseUp() {
		grabbedCmp?.classList.remove("active")
		grabbedCmp = null;
		callback = null;
	}
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}></svelte:window>

<Component on:componentDown={onCmpDown}></Component>
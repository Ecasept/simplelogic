<script lang="ts">
	import type { Snippet } from "svelte";
	let { content }: { content: Snippet } = $props();
</script>

<!-- The container for canvas overlays -->
<div id="container">
	{@render content()}
</div>

<style>
	#container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>

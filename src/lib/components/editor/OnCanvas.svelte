<script lang="ts">
	import type { Snippet } from "svelte";
	let { content }: { content: Snippet } = $props();
</script>

<!-- The container for canvas overlays -->
<div id="on-canvas-container">
	{@render content()}
</div>

<style lang="scss">
	@use "src/lib/css/variables.scss" as *;
	#on-canvas-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		pointer-events: none;
	}
	/* Make sure that the children of the container can be interacted with,
	 * event if the container itself cannot */
	:global(#on-canvas-container > *) {
		pointer-events: auto;
	}

	@media (max-width: $mobile-breakpoint) {
		#container {
			flex-direction: column-reverse;
			bottom: 0;
		}
	}
</style>

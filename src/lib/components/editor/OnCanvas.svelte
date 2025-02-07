<script lang="ts">
	import type { Snippet } from "svelte";
	let { content }: { content: Snippet } = $props();
</script>

<!-- The container for canvas overlays -->
<div id="container">
	{@render content()}
</div>

<style lang="scss">
	@use "src/lib/css/variables.scss" as *;
	#container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: $mobile-breakpoint) {
		#container {
			flex-direction: column-reverse;
			bottom: 0;
		}
	}
</style>

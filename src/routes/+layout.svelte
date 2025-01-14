<script lang="ts">
	import "$lib/css/global.scss";
	import "$lib/css/normalize.css";
	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children?.()}

<script lang="ts">
	import Theme from "$lib/components/Theme.svelte";
	import "$lib/css/global.scss";
	import "$lib/css/normalize.css";
	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
</script>

<Theme />
{@render children?.()}

<script lang="ts">
	let { text, margin = "0px" }: { text: string, margin?: string } = $props();
</script>

<div id="container" style="margin: {margin};">
	<hr id="before"/>
	<span>{text}</span>
	<hr id="after"/>
</div>

<style lang="scss">
	#container {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	hr {
		flex: 1;
		border: 1px solid var(--on-surface-color);
	}
	span {
		color: var(--on-surface-color);
	}
</style>

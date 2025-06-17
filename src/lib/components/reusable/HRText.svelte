<script lang="ts">
	let { text, margin = "0px" }: { text: string; margin?: string } = $props();
</script>

<div id="container" style="margin: {margin};">
	<hr id="before" />
	<span>{text}</span>
	<hr id="after" />
</div>

<style lang="scss">
	#container {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	hr {
		flex: 1;
		border: none;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--on-surface-color),
			transparent
		);
		opacity: 0.3;
	}
	span {
		color: var(--on-surface-color);
		font-size: 0.875rem;
		font-weight: 500;
		opacity: 0.7;
		white-space: nowrap;
	}
</style>

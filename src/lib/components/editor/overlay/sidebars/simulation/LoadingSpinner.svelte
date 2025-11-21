<script lang="ts">
	let {
		size,
		spinnerWidth,
	}: {
		/** Width/height of the spinner in pixels */
		size: number;
		/** Thickness of the spinner ring in pixels */
		spinnerWidth: number;
	} = $props();
</script>

<span class="loader" style="--size: {size}px; --spinner-width: {spinnerWidth}px"
></span>

<style lang="scss">
	.loader {
		display: inline-block;
		width: var(--size);
		--color: var(--on-primary-color);
		aspect-ratio: 1;
		border-radius: 50%;
		background:
			radial-gradient(farthest-side, var(--color) 94%, #0000)
				top/var(--spinner-width) var(--spinner-width) no-repeat,
			conic-gradient(#0000 10%, var(--color));

		-webkit-mask: radial-gradient(
			farthest-side,
			#0000 calc(100% - var(--spinner-width)),
			#000 0
		);
		mask: radial-gradient(
			farthest-side,
			#0000 calc(100% - var(--spinner-width)),
			#000 0
		);
		animation: spin 1s infinite linear;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
</style>

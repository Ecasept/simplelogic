<script lang="ts">
	let {
		value,
		min,
		max,
		step,
		onChange,
	}: {
		value: number;
		min: number;
		max: number;
		step: number;
		onChange: (newValue: number) => void;
	} = $props();
</script>

<div class="container">
	<span class="label">
		<span class="label-text">Step Delay</span>
		<span class="label-value">
			{#if value === 0}
				Instant
			{:else}
				{value} ms
			{/if}
		</span>
	</span>
	<input
		type="range"
		{min}
		{max}
		{step}
		{value}
		oninput={(e) => onChange(parseInt(e.currentTarget.value))}
		style="--progress-raw: {((value - min) / (max - min)) * 100};"
	/>
</div>

<style lang="scss">
	@use "sass:math";
	@use "sass:string";

	$not-filled: var(--primary-color);
	$filled: var(--on-primary-color);
	$thumb-inner: var(--primary-color);
	$thumb-size: 14px;
	$thumb-border: 2px;

	.label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary-color);

		& .label-value {
			font-size: 12px;
		}
	}

	input {
		-webkit-appearance: none;
		appearance: none;
		background-color: transparent;

		width: 100%;

		// Formula: progress - correction
		// correction = (progress - 50) / 100 * thumb-size
		// at progress = 100, move left by half the thumb size
		// at progress = 0, move right by half the thumb size
		// at progress = 50, no correction

		--progress: calc(
			(
				var(--progress-raw) * 1% -
					((var(--progress-raw) - 50) / 100 * #{$thumb-size})
			)
		);
	}

	@mixin track {
		background: linear-gradient(
			to right,
			$filled var(--progress),
			$not-filled var(--progress)
		);

		border-radius: math.div($thumb-size, 2);
		height: $thumb-size;
	}

	@mixin thumb {
		-webkit-appearance: none;
		appearance: none;
		border: $thumb-border solid $filled;
		height: calc($thumb-size - $thumb-border * 2);
		width: calc($thumb-size - $thumb-border * 2);
		border-radius: 50%;
		background-color: $thumb-inner;
		cursor: pointer;
		box-sizing: content-box;
	}

	// Chrome requires the firefox and chrome version to be defined separately for some reason

	input::-webkit-slider-runnable-track {
		@include track;
	}
	input::-moz-range-track {
		@include track;
	}

	input::-webkit-slider-thumb {
		@include thumb;
	}
	input::-moz-range-thumb {
		@include thumb;
	}
</style>

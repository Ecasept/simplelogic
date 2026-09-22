<script lang="ts">
	type Option = { value: string; label: string };
	type Props = {
		label: string;
		value: string;
		options: readonly Option[];
		onChange: (value: string) => void;
	};

	let { label, value, options, onChange }: Props = $props();
</script>

<div class="control">
	<span>{label}</span>
	<div class="segments" role="radiogroup" aria-label={label}>
		{#each options as option}
			<button
				type="button"
				role="radio"
				aria-checked={value === option.value}
				class:selected={value === option.value}
				onclick={() => onChange(option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.control {
		display: grid;
		gap: 7px;
		padding: 7px 5px;
		color: var(--on-surface-color);
	}

	.segments {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 2px;
		border: 1px solid var(--primary-container-border-color);
		border-radius: var(--default-border-radius);
		background: var(--surface-variant-color);
	}

	button {
		border: 0;
		border-radius: calc(var(--default-border-radius) - 2px);
		padding: 7px 10px;
		background: transparent;
		color: var(--on-surface-color);
		cursor: pointer;
	}

	button.selected {
		background: var(--primary-color);
		color: var(--on-primary-color);
	}

	button:focus-visible {
		outline: 2px solid var(--selected-outline-color);
		outline-offset: 1px;
	}
</style>

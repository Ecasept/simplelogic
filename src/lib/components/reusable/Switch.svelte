<script lang="ts">
	type Props = {
		label: string;
		checked: boolean;
		onChange: (checked: boolean) => void;
		disabled?: boolean;
	};

	let { label, checked, onChange, disabled = false }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	{disabled}
	onclick={() => onChange(!checked)}
>
	<span>{label}</span>
	<span class="track" aria-hidden="true"><span class="thumb"></span></span>
</button>

<style>
	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 12px;
		padding: 7px 5px;
		border: 0;
		background: transparent;
		color: var(--on-surface-color);
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.track {
		box-sizing: border-box;
		width: 42px;
		height: 24px;
		padding: 2px;
		border: 1px solid var(--primary-border-color);
		border-radius: 999px;
		background: var(--surface-variant-color);
		transition: background-color 0.15s ease;
	}

	.thumb {
		display: block;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--on-surface-variant-color);
		transition:
			transform 0.15s ease,
			background-color 0.15s ease;
	}

	button[aria-checked="true"] .track {
		background: var(--primary-color);
	}

	button[aria-checked="true"] .thumb {
		transform: translateX(18px);
		background: var(--on-primary-color);
	}

	button:focus-visible {
		outline: 2px solid var(--selected-outline-color);
		outline-offset: 2px;
		border-radius: var(--default-border-radius);
	}
</style>

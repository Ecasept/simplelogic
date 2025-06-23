<script lang="ts">
	import { type Icon as IconType } from "lucide-svelte";

	type Props = {
		disabled?: boolean;
		text?: string | null;
		title?: string | null;
		onClick: (e: MouseEvent) => void;
		icon?: typeof IconType | null;
		margin?: string;
		height?: string;
		type?: "danger" | "primary";
		reversed?: boolean;
	};
	let {
		icon: Icon = null,
		disabled = false,
		text = null,
		title = null,
		onClick,
		margin = "5px",
		height = "auto",
		type = "primary",
		reversed = false,
	}: Props = $props();
</script>

<button
	{disabled}
	{title}
	class={{
		icon: Icon !== null,
		danger: type === "danger",
		primary: type === "primary",
		reversed
	}}
	aria-label={title}
	onclick={onClick}
	style={"margin:" + margin + "; height:" + height}
>
	{#if Icon}
		<Icon />
	{/if}
	{#if text}{text}{/if}
</button>

<style>
	button {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		border: 1px solid var(--primary-border-color);
		cursor: pointer;
		border-radius: var(--default-border-radius);
		padding: var(--padding, 8px);

		&:hover {
			background-color: var(--primary-highlight-color);
		}

		&.icon {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 5px;
		}

		&.reversed {
			flex-direction: row-reverse;
		}
	}

	button:disabled {
		background-color: var(--primary-color);
		color: var(--primary-disabled-color);
		border: 1px solid var(--primary-disabled-color);
		cursor: default;
	}

	button.danger {
		background-color: var(--danger-color);
		color: var(--on-danger-color);
		border-color: var(--danger-border-color);
	}

	button.danger:hover {
		background-color: var(--danger-highlight-color);
	}
</style>

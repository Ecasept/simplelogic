<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		disabled?: boolean;
		text: string;
		title?: string | null;
		onClick: (e: MouseEvent) => void;
		icon?: Snippet | null;
		margin?: string;
		height?: string;
	};
	let {
		icon = null,
		disabled = false,
		text,
		title = null,
		onClick,
		margin = "5px",
		height = "auto",
	}: Props = $props();
</script>

<button
	{disabled}
	{title}
	class={[icon && "icon"]}
	aria-label={title}
	onclick={onClick}
	style={"margin:" + margin + "; height:" + height}
>
	{@render icon?.()}
	{#if text}{text}{/if}
</button>

<style>
	button {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		border: 1px solid var(--primary-border-color);
		cursor: pointer;
		border-radius: 12px;
		padding: 8px;

		&:hover {
			background-color: var(--primary-highlight-color);
		}

		&.icon {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 5px;
		}
	}
	button:disabled {
		background-color: var(--primary-color);
		color: var(--primary-disabled-color);
		border: 1px solid var(--primary-disabled-color);
		cursor: default;
	}
</style>

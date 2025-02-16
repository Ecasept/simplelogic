<script lang="ts">
	import { ModeAction } from "$lib/util/actions";
	import { onEnter } from "$lib/util/keyboard";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { MousePointer2, Play, Trash2 } from "lucide-svelte";

	let { uiState }: { uiState: EditorUiState } = $props();

	const modes = [
		{
			icon: MousePointer2,
			name: "edit",
			switchTo: ModeAction.switchToDefaultMode,
		},
		{
			icon: Play,
			name: "simulate",
			switchTo: ModeAction.switchToSimulateMode,
		},
		{
			icon: Trash2,
			name: "delete",
			switchTo: ModeAction.switchToDeleteMode,
		},
	];

	let currentMode = $derived(uiState.mode);
</script>

<div class="toolbar">
	{#each modes as { icon: Icon, name, switchTo }, i}
		{@const cls = name === currentMode ? "selected" : ""}
		{@const tooltip = `Switch to ${name ?? "default"} mode`}
		<button
			aria-label={tooltip}
			aria-pressed={name === currentMode}
			onkeydown={onEnter(switchTo)}
			tabindex={0}
			title={tooltip}
			class={"icon " + cls}
			onclick={() => switchTo()}
		>
			<Icon />
		</button>
	{/each}
</div>

<style>
	.toolbar {
		display: flex;
		justify-content: space-around;
		background-color: var(--surface-color);
		color: var(--on-surface-color);
		margin: 10px;
		border-radius: var(--default-border-radius);
		gap: 5px;
		padding: 5px;
		border: 1px solid var(--surface-border-color);
		box-shadow: 0px 0px 10px var(--shadow-color);
	}
	.icon {
		cursor: pointer;
		padding: 5px;
		border-radius: var(--default-border-radius);
		transition: background-color 0.1s;
		background-color: transparent;
		border: none;
		color: var(--on-surface-color);
		line-height: 0;
	}
	.icon:hover {
		background-color: var(--surface-highlight-color);
	}
	.icon.selected {
		background-color: var(--surface-highlight-color);
		cursor: default;
	}
</style>

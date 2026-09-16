<script lang="ts">
	import type { EditorUiState } from "$lib/util/editorUiState";

	import {
		graphActions,
		graphManager,
		modeActions,
		persistenceActions,
	} from "$lib/util/editor.svelte";
	import { onEnter } from "$lib/util/keyboard";

	import {
		CopyX,
		Download,
		MousePointer2,
		Play,
		Save,
		Trash2,
		Undo,
		type Icon as IconType,
	} from "lucide-svelte";

	type Props = {
		uiState: EditorUiState;
		simulating: boolean;
	};

	let { uiState, simulating }: Props = $props();

	const modes = [
		{
			icon: MousePointer2,
			name: "edit",
			switchTo: modeActions.switchToDefaultMode,
		},
		{
			icon: Play,
			name: "simulate",
			switchTo: modeActions.switchToSimulateMode,
		},
		{
			icon: Trash2,
			name: "delete",
			switchTo: modeActions.switchToDeleteMode,
		},
	];

	let currentMode = $derived(uiState.mode);
</script>

{#snippet divider()}
	<!-- vertical bar to separate different sections in the toolbar -->
	<div class="divider"></div>
{/snippet}

{#snippet toolbarButton(
	title: string,
	Icon: typeof IconType,
	action: () => Promise<void> | void,
	disabled: boolean = false,
	selected: boolean | null = null,
)}
	<button
		aria-label={title}
		onkeydown={onEnter(action)}
		tabindex={0}
		{title}
		class={{ icon: true, selected }}
		onclick={action}
		{disabled}
		aria-pressed={selected}
	>
		<Icon />
	</button>
{/snippet}

<div class="editor-overlay toolbar">
	{#each modes as { icon: Icon, name, switchTo }, i}
		{@const cls = name === currentMode ? "selected" : ""}
		{@const tooltip = `Switch to ${name ?? "default"} mode`}
		{@render toolbarButton(
			"Switch to " + name + " mode",
			Icon,
			switchTo,
			false,
			name === currentMode,
		)}
	{/each}
	{@render divider()}
	{@render toolbarButton(
		"Undo",
		Undo,
		graphActions.undo,
		simulating || graphManager.historyEmpty,
	)}

	{@render toolbarButton("Save circuit", Save, persistenceActions.saveGraph)}
	{@render toolbarButton(
		"Load circuit",
		Download,
		persistenceActions.loadGraphManually,
	)}
	{@render toolbarButton("Clear canvas", CopyX, graphActions.clearCanvas)}
</div>

<style>
	.toolbar {
		display: flex;
		justify-content: space-around;
		gap: 5px;
		padding: 5px;
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
	.icon:hover:not(:disabled) {
		background-color: var(--surface-highlight-color);
	}
	.icon.selected {
		background-color: var(--surface-highlight-color);
		cursor: default;
	}
	.icon:disabled {
		color: var(--primary-disabled-color);
		cursor: default;
	}

	.divider {
		width: 1px;
		margin: 4px 2px;
		background-color: var(--surface-border-color);
	}
</style>

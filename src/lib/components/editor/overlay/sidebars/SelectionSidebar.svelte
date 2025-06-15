<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { EditorAction, graphManager } from "$lib/util/actions";
	import { debugLog } from "$lib/util/global.svelte";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { RotateCcw, RotateCw, Trash, Zap, ZapOff } from "lucide-svelte";
	import { match, P } from "ts-pattern";
	import Sidebar from "./Sidebar.svelte";

	const { uiState }: { uiState: EditorUiState } = $props();

	let open = $state(true);

	let info = $derived.by(() => {
		const selectedId = uiState.matches({ selected: P.number })
			? uiState.selected
			: null;
		if (selectedId === null) {
			return { selectedId: null, type: null, data: null };
		}
		const type = graphManager.getElementTypeReactive(selectedId);
		if (type === null) {
			console.error("Selected element not found in graph");
			return { selectedId: null, type: null, data: null };
		}
		return match(type)
			.with("component", (typedType) => {
				const data = graphManager.getComponentDataReactive(selectedId);
				return { selectedId, type: typedType, data };
			})
			.with("wire", (typedType) => {
				const data = graphManager.getWireDataReactive(selectedId);
				return { selectedId, type: typedType, data };
			})
			.exhaustive();
	});

	function toggle() {
		open = !open;
	}

	$inspect(info).with(debugLog("INFO"));
</script>

{#snippet deleteButton()}
	<Button
		title="Delete selected element"
		text="Delete"
		onClick={() => EditorAction.deleteSelected()}
		icon={Trash}
		margin="0"
		type="danger"
	/>
{/snippet}

{#if info.selectedId !== null}
	{#if uiState.matches({ mode: "edit" })}
		<Sidebar
			headerText="Element Settings"
			uniqueName={"selection"}
			{toggle}
			{open}
		>
			<div class="sidebar-content">
				{#if info.type === "component"}
					{@const mapping: Record<string, string> = {
						IN: "Input",
						LED: "LED",
					}}
					{@const type = info.data.type}
					{@const infoText = mapping[type] || type + " Gate"}
					<p class="selected-element-text">
						Selected: <strong>{infoText}</strong>
					</p>
					<div class="actions-container">
						{#if info.data.type === "IN"}
							{@const powered = info.data.isPoweredInitially}
							{@const powerText = powered ? "Turn Off" : "Turn On"}
							{@const icon = powered ? ZapOff : Zap}
							<Button
								text={powerText}
								onClick={() => EditorAction.togglePower(info.selectedId)}
								{icon}
								margin="0"
							/>
						{/if}
						<div class="button-group">
							<Button
								title="Rotate clockwise 90 degrees"
								onClick={() =>
									EditorAction.rotateComponent(info.selectedId, 90)}
								icon={RotateCw}
								margin="0"
							/>
							<Button
								title="Rotate counter-clockwise 90 degrees"
								onClick={() =>
									EditorAction.rotateComponent(info.selectedId, -90)}
								icon={RotateCcw}
								margin="0"
							/>
						</div>
						{@render deleteButton()}
					</div>
				{:else if info.type === "wire"}
					<p class="selected-element-text">Selected: <strong>Wire</strong></p>
					{@render deleteButton()}
				{/if}
			</div>
		</Sidebar>
	{/if}
{/if}

<style>
	.sidebar-content {
		display: flex;
		flex-direction: column;
		gap: 10px; /* Reduced spacing */
		/* padding: 8px; */
	}

	.selected-element-text {
		font-size: 0.9em;
		text-align: center;
		margin-top: 8px;
	}

	.actions-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
	}

	.button-group {
		display: flex;
		gap: 8px;
	}

	.button-group > :global(button) {
		flex-grow: 1;
	}

	p {
		margin: 0;
	}
</style>

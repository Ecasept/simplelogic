<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import {
		DeleteAction,
		EditorAction,
		editorViewModel,
		graphManager,
		DuplicateAction,
	} from "$lib/util/actions.svelte";
	import { COMPONENT_DATA, debugLog } from "$lib/util/global.svelte";
	import { onEnter } from "$lib/util/keyboard";
	import type { InputInputEvent } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { RotateCcw, RotateCw, Trash, Zap, ZapOff } from "lucide-svelte";
	import { match } from "ts-pattern";
	import Sidebar from "./Sidebar.svelte";

	const { uiState }: { uiState: EditorUiState } = $props();

	let open = $state(true);

	let info = $derived.by(() => {
		// Check if we're in edit mode and have selections
		if (!uiState.matches({ mode: "edit" }) || !("selected" in uiState)) {
			return { selectedId: null, type: null, data: null, selectionCount: 0 };
		}

		const selectionCount = uiState.selected.size;
		if (selectionCount === 0) {
			return { selectedId: null, type: null, data: null, selectionCount: 0 };
		}

		// For now, show details only if exactly one element is selected
		if (selectionCount === 1) {
			const [selectedId, elementType] = uiState.selected
				.entries()
				.next().value!;
			const type = graphManager.getElementTypeReactive(selectedId);
			if (type === null) {
				console.error("Selected element not found in graph");
				return { selectedId: null, type: null, data: null, selectionCount };
			}
			return match(type)
				.with("component", (typedType) => {
					const data = graphManager.getComponentDataReactive(selectedId);
					return { selectedId, type: typedType, data, selectionCount };
				})
				.with("wire", (typedType) => {
					const data = graphManager.getWireDataReactive(selectedId);
					return { selectedId, type: typedType, data, selectionCount };
				})
				.exhaustive();
		}

		// Multiple elements selected - show general multi-selection info
		return { selectedId: null, type: null, data: null, selectionCount };
	});

	function toggle() {
		open = !open;
	}

	function onTextInput(e: InputInputEvent) {
		const newText = e.currentTarget.value;
		console.log(newText);
		if (info.selectedId === null) {
			console.error("No element selected to update text");
			return;
		}
		EditorAction.updateTextReplaceable(info.selectedId, newText);
	}

	function onNumberInput(newSize: number) {
		if (info.selectedId === null) {
			console.error("No element selected to update font size");
			return;
		}
		EditorAction.updateTextFontSize(info.selectedId, newSize);
	}

	function onEnterPressed() {
		// Unfocus textbox
		editorViewModel.clearSelection();
	}

	$inspect(info).with(debugLog("INFO"));
</script>

{#snippet deleteButton()}
	<Button
		title="Delete selected element"
		text="Delete"
		onClick={() => DeleteAction.deleteSelected()}
		icon={Trash}
		margin="0"
		type="danger"
	/>
{/snippet}
{#snippet duplicateButton()}
	<Button
		title="Duplicate selected element(s)"
		text="Duplicate"
		onClick={() => DuplicateAction.duplicateSelected()}
		margin="0"
	/>
{/snippet}

{#if info.selectionCount > 0}
	{#if uiState.matches({ mode: "edit", editType: "idle" })}
		<Sidebar
			headerText="Element Settings"
			uniqueName={"selection"}
			{toggle}
			{open}
		>
			<div class="selection-sidebar-content">
				{#if info.selectionCount === 1 && info.selectedId !== null}
					{#if info.type === "component"}
						<p class="selected-element-text">
							Selected: <strong>{COMPONENT_DATA[info.data.type].name}</strong>
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
							{@render duplicateButton()}

							{#if info.data.type === "TEXT"}
								<div class="text-data-container">
									<input
										title="Text"
										aria-label="Text"
										type="text"
										placeholder="Enter text"
										value={info.data.customData?.text}
										oninput={onTextInput}
										onkeypress={onEnter(onEnterPressed)}
									/>
									<input
										title="Font size"
										aria-label="Font size"
										type="number"
										placeholder="Font size"
										value={info.data.customData?.fontSize}
										oninput={(e) => {
											const newSize = parseInt(e.currentTarget.value, 10);
											if (!isNaN(newSize)) {
												onNumberInput(newSize);
											}
										}}
									/>
								</div>
							{/if}
						</div>
					{:else if info.type === "wire"}
						<p class="selected-element-text">Selected: <strong>Wire</strong></p>
						{@render deleteButton()}
						{@render duplicateButton()}
					{/if}
				{:else}
					<!-- Multiple elements selected -->
					<p class="selected-element-text">
						Selected: <strong>{info.selectionCount} elements</strong>
					</p>
					<div class="actions-container">
						{@render deleteButton()}
						{@render duplicateButton()}
					</div>
				{/if}
			</div>
		</Sidebar>
	{/if}
{/if}

<style lang="scss">
	.selection-sidebar-content {
		display: flex;
		flex-direction: column;
		gap: 10px;
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

	.text-data-container {
		display: flex;
		gap: 8px;

		& :first-child {
			flex: 4 1 0;
		}
		& :last-child {
			flex: 1 1 0;
		}
	}

	input {
		min-width: 0;
		padding: 12px 16px;
		background-color: var(--primary-color);
		border: 2px solid var(--primary-border-color);
		color: var(--on-primary-color);
		border-radius: var(--default-border-radius);
		font-size: 1rem;
		transition: all 0.2s ease;

		&:focus {
			outline: none;
			box-shadow: 0 0 0 3px var(--primary-color);
		}
	}

	// Hide spin buttons
	input[type="number"]::-webkit-inner-spin-button,
	input[type="number"]::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type="number"] {
		-moz-appearance: textfield; /* Firefox */
		appearance: textfield;
	}
</style>

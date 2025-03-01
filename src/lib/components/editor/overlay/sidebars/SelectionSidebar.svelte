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
		if (selectedId === null)
			return { selectedId: null, type: null, data: null };
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

{#if info.selectedId !== null}
	{#if uiState.matches({ mode: "edit" })}
		<Sidebar
			headerText="Element Settings"
			uniqueName={"selection"}
			{toggle}
			{open}
		>
			{#if info.type === "component"}
				{info.data.type} Gate selected
				{#if info.data.type === "IN"}
					{@const powered = info.data.isPoweredInitially}
					{@const powerText = powered ? "On" : "Off"}
					{@const icon = powered ? ZapOff : Zap}
					<Button
						title="Turn {powerText}"
						onClick={() => EditorAction.togglePower(info.selectedId)}
						{icon}
						margin="0"
					/>
				{:else if info.data.type === "LED"}
					LED selected
				{/if}
				<Button
					title="Rotate clockwise 90 degrees"
					onClick={() => EditorAction.rotateComponent(90)}
					icon={RotateCw}
					margin="0"
				/>
				<Button
					title="Rotate counter-clockwise 90 degrees"
					onClick={() => EditorAction.rotateComponent(-90)}
					icon={RotateCcw}
					margin="0"
				/>
			{:else if info.type === "wire"}
				Wire selected
			{/if}

			<Button
				title="Delete"
				onClick={() => EditorAction.deleteSelected()}
				icon={Trash}
				margin="0"
			/>
		</Sidebar>
	{/if}
{/if}

<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { EditorAction } from "$lib/util/actions";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { RotateCcw, RotateCw, Trash } from "lucide-svelte";
	import { P } from "ts-pattern";
	import Sidebar from "./Sidebar.svelte";

	const { uiState }: { uiState: EditorUiState } = $props();

	let open = $state(true);

	function toggle() {
		open = !open;
	}
</script>

{#if uiState.matches({ selected: P.number })}
	{#if uiState.matches({ mode: "edit" })}
		<Sidebar
			headerText="Element Settings"
			uniqueName={"selection"}
			{toggle}
			{open}
		>
			<Button
				title="Rotate clockwise 90 degrees"
				onClick={() => EditorAction.rotateComponent(90)}
				icon={RotateCw}
			/>
			<Button
				title="Rotate counter-clockwise 90 degrees"
				onClick={() => EditorAction.rotateComponent(-90)}
				icon={RotateCcw}
			/>
			<Button
				title="Delete"
				onClick={() => EditorAction.deleteSelected()}
				icon={Trash}
			/>
		</Sidebar>
	{/if}
{/if}

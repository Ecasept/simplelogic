<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { EditorAction } from "$lib/util/actions";
	import { simulation } from "$lib/util/simulation.svelte";
	import type { ComponentType } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { Play } from "lucide-svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import Sidebar from "./Sidebar.svelte";

	const { uiState } = $props<{ uiState: EditorUiState }>();

	function addComponent(type: ComponentType, e: PointerEvent) {
		EditorAction.addComponent(type, { x: e.clientX, y: e.clientY }, "drag");
	}

	let open = $state(true);

	function toggle() {
		open = !open;
	}
</script>

{#if uiState.matches({ mode: "edit" })}
	<Sidebar headerText="Tools" {toggle} {open}>
		<ComponentToolbar onPointerDown={addComponent} />
	</Sidebar>
{:else if uiState.matches({ mode: "simulate" })}
	<Sidebar headerText="Tools" {toggle} {open}>
		<Button
			title="Simulate"
			text="Simulate"
			onClick={() => simulation.startSimulation()}
			icon={Play}
		/>
	</Sidebar>
{/if}

<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { AddAction, editorViewModel } from "$lib/util/actions.svelte";
	import type { ComponentType } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { Magnet } from "lucide-svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import Sidebar from "./Sidebar.svelte";
	import SidebarSection from "./SidebarSection.svelte";
	import SimulationSidebarContent from "./SimulationSidebarContent.svelte";

	const { uiState } = $props<{ uiState: EditorUiState }>();

	function addComponent(type: ComponentType, e: PointerEvent) {
		AddAction.addComponent(type, { x: e.clientX, y: e.clientY }, "drag");
	}

	let open = $state(true);

	function toggle() {
		open = !open;
	}

	function toggleGridSnap() {
		editorViewModel.setGridSnap(!uiState.gridSnap);
	}
</script>

{#if uiState.matches({ mode: "edit", editType: "idle" })}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SidebarSection text="Components">
			<ComponentToolbar onPointerDown={addComponent} />
		</SidebarSection>
		<SidebarSection text="Settings">
			{@const text = uiState.gridSnap ? "Disable" : "Enable"}
			<Button
				title="{text} grid snap"
				text="{text} grid snap"
				onClick={toggleGridSnap}
				icon={Magnet}
			/>
		</SidebarSection>
	</Sidebar>
{:else if uiState.matches({ mode: "simulate" })}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SimulationSidebarContent />
	</Sidebar>
{/if}

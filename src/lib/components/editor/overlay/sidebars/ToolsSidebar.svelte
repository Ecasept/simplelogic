<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import { simulation } from "$lib/util/simulation.svelte";
	import type { ComponentType } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { Magnet, Play } from "lucide-svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import Sidebar from "./Sidebar.svelte";
	import SidebarSection from "./SidebarSection.svelte";

	const { uiState } = $props<{ uiState: EditorUiState }>();

	function addComponent(type: ComponentType, e: PointerEvent) {
		EditorAction.addComponent(type, { x: e.clientX, y: e.clientY }, "drag");
	}

	let open = $state(true);

	function toggle() {
		open = !open;
	}

	function toggleGridSnap() {
		editorViewModel.setGridSnap(!uiState.gridSnap);
	}
</script>

{#if uiState.matches({ mode: "edit" })}
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
		<Button
			title="Simulate"
			text="Simulate"
			onClick={() => simulation.startSimulation()}
			icon={Play}
		/>
	</Sidebar>
{/if}

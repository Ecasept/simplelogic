<script lang="ts">
	import type { EditorUiState } from "$lib/util/editorUiState";

	import Button from "$lib/components/reusable/Button.svelte";
	import {
		interactionController,
		editorViewModel,
	} from "$lib/util/editor.svelte";
	import type { ComponentType } from "$lib/util/types";

	import { Magnet, ReplaceAll, SquareDashed } from "lucide-svelte";
	import ComponentToolbar from "./ComponentToolbar.svelte";
	import Sidebar from "./Sidebar.svelte";
	import SidebarSection from "./SidebarSection.svelte";
	import SimulationSidebarContent from "./simulation/SimulationSidebarContent.svelte";
	import { P } from "ts-pattern";

	const { uiState }: { uiState: EditorUiState } = $props();

	function addComponent(type: ComponentType, e: PointerEvent) {
		interactionController.addComponent(
			type,
			{ x: e.clientX, y: e.clientY },
			"drag",
			e.pointerId,
		);
	}

	let open = $state(true);

	function toggle() {
		open = !open;
	}

	function toggleGridSnap() {
		editorViewModel.setGridSnap(!uiState.settings.gridSnap);
	}
	function toggleAreaSelect() {
		const newValue =
			uiState.settings.areaSelectType === "contain" ? "intersect" : "contain";
		editorViewModel.setAreaSelectType(newValue);
	}
	function toggleContinuousPlacement() {
		editorViewModel.setContinuousPlacement(
			!uiState.settings.continuousPlacement,
		);
	}
</script>

{#if uiState.matches( { mode: "edit", kind: P.union("idle", "elementDown", "pan", "area") }, )}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SidebarSection text="Components">
			<ComponentToolbar onPointerDown={addComponent} />
		</SidebarSection>
		<SidebarSection text="Settings">
			{@const gridSnapText = uiState.settings.gridSnap ? "Disable" : "Enable"}
			{@const areaSelectText =
				uiState.settings.areaSelectType === "contain"
					? "Switch to intersect area select"
					: "Switch to contain area select"}
			{@const continousPlacementText = uiState.settings.continuousPlacement
				? "Disable"
				: "Enable"}
			<Button
				title="{continousPlacementText} continuous placement"
				text="{continousPlacementText} continuous placement"
				onClick={toggleContinuousPlacement}
				icon={ReplaceAll}
			/>
			<Button
				title="{gridSnapText} grid snap"
				text="{gridSnapText} grid snap"
				onClick={toggleGridSnap}
				icon={Magnet}
			/>
			<Button
				title={areaSelectText}
				text={areaSelectText}
				onClick={toggleAreaSelect}
				icon={SquareDashed}
			/>
		</SidebarSection>
	</Sidebar>
{:else if uiState.matches({ mode: "simulate" })}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SimulationSidebarContent />
	</Sidebar>
{/if}

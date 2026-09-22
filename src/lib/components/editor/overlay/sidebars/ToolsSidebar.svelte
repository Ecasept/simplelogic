<script lang="ts">
	import type { EditorUiState } from "$lib/util/editor/editorUiState";

	import Switch from "$lib/components/reusable/Switch.svelte";
	import SegmentedControl from "$lib/components/reusable/SegmentedControl.svelte";
	import {
		interactionController,
		editorViewModel,
	} from "$lib/util/editor/editor.svelte";
	import type { ComponentType } from "$lib/util/shared/types";

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
</script>

{#if uiState.matches( { mode: "edit", kind: P.union("idle", "elementDown", "pan", "area") }, )}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SidebarSection text="Components">
			<ComponentToolbar onPointerDown={addComponent} />
		</SidebarSection>
		<SidebarSection text="Settings">
			<Switch
				label="Continuous placement"
				checked={uiState.settings.continuousPlacement}
				onChange={(checked) => editorViewModel.setContinuousPlacement(checked)}
			/>
			<Switch
				label="Grid snap"
				checked={uiState.settings.gridSnap}
				onChange={(checked) => editorViewModel.setGridSnap(checked)}
			/>
			<SegmentedControl
				label="Area selection"
				value={uiState.settings.areaSelectType}
				options={[
					{ value: "intersect", label: "Intersect" },
					{ value: "contain", label: "Contain" },
				]}
				onChange={(value) =>
					editorViewModel.setAreaSelectType(value as "intersect" | "contain")}
			/>
		</SidebarSection>
	</Sidebar>
{:else if uiState.matches({ mode: "simulate" })}
	<Sidebar headerText="Tools" uniqueName={"tools"} {toggle} {open}>
		<SimulationSidebarContent />
	</Sidebar>
{/if}

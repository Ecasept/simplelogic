<script lang="ts">
	import CancelButton from "$lib/components/editor/CancelButton.svelte";
	import Canvas from "$lib/components/editor/Canvas.svelte";
	import OnCanvas from "$lib/components/editor/OnCanvas.svelte";
	import Toolbar from "$lib/components/editor/Toolbar.svelte";
	import CircuitModal from "$lib/components/modal/CircuitModal.svelte";
	import Sidebar from "$lib/components/sidebar/Sidebar.svelte";
	import {
		canvasViewModel,
		ChangesAction,
		circuitModalViewModel,
		EditorAction,
		editorViewModel,
	} from "$lib/util/actions";
	import { mousePosition, setMousePosition } from "$lib/util/global";
	import { handleKeyDown } from "$lib/util/keyboard";
	import { cancelLongPress, cancelLongPressIfMoved } from "$lib/util/longpress";
	import { getThemeClass } from "$lib/util/theme.svelte";
	import { sidebarViewModel } from "$lib/util/viewModels/sidebarViewModel";
	import { P } from "ts-pattern";

	let { data }: { data: import("./$types").LayoutData } = $props();
	let themeClass = $derived.by(getThemeClass);

	function updatePosition(e: PointerEvent) {
		const pos = { x: e.clientX, y: e.clientY };
		setMousePosition(pos);

		const uiState = editorViewModel.uiState;

		if (
			uiState.matches({
				editType: P.union("draggingComponent", "addingComponent"),
				isPanning: false,
			})
		) {
			EditorAction.moveComponentReplaceable(pos, uiState.componentId);
		} else if (
			uiState.matches({
				editType: P.union("draggingWire", "addingWire"),
				isPanning: false,
			})
		) {
			EditorAction.moveWireConnectionReplaceable(
				pos,
				uiState.draggedHandle.id,
				uiState.draggedHandle.handleType,
			);
		}
	}

	function onPointerMove(e: PointerEvent) {
		updatePosition(e);
		cancelLongPressIfMoved(mousePosition);
	}

	function onPointerUp(e: PointerEvent) {
		// on touch screens, no pointer move events are emitted for adding components
		// so we need to update the position here
		updatePosition(e);

		cancelLongPress();

		const uiState = editorViewModel.uiState;

		if (!uiState.matches({ mode: "edit", editType: P.not("idle") })) {
			// not in edit mode or not editing anything
			return;
		}

		if (
			uiState.matches({ editType: P.union("draggingWire", "addingWire") }) &&
			uiState.hoveredHandle !== null
		) {
			// A wire is being dragged, and it is hovering over a handle
			// -> connect the wire to the handle
			EditorAction.connect(
				{
					id: uiState.draggedHandle.id,
					handleType: uiState.draggedHandle.handleType,
				},
				// uiState is a rune, so we need to snapshot it
				$state.snapshot(uiState.hoveredHandle),
			);
			editorViewModel.removeHoveredHandle();
		}

		if (
			uiState.matches({
				editType: P.union("draggingComponent", "draggingWire"),
				hasMoved: false,
			})
		) {
			// The component/wire was clicked, but not moved
			// -> select it
			const id = uiState.matches({ editType: "draggingComponent" })
				? uiState.componentId
				: uiState.draggedHandle.id;
			ChangesAction.abortEditing(); // discard the changes made while dragging
			EditorAction.select(id);
			return;
		}

		if (uiState.matches({ editType: "draggingWireMiddle" })) {
			// The middle of a wire was dragged/clicked
			// -> select the wire
			const wireId = uiState.wireId;
			console.log(wireId, uiState.hoveredElement);
			const stillHovered = uiState.hoveredElement === wireId;
			ChangesAction.abortEditing(); // discard any changes made while dragging
			if (stillHovered) {
				// if the wire is still hovered, select it
				EditorAction.select(wireId);
			}
			return;
		}

		// commit the changes that were made while dragging
		ChangesAction.commitChanges();
	}

	let addingComponent = $derived(
		editorViewModel.uiState.matches({
			editType: "addingComponent",
		}),
	);
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<OnCanvas>
		{#snippet content()}
			<Toolbar uiState={editorViewModel.uiState}></Toolbar>
			<CancelButton
				shouldShow={addingComponent}
				cancel={ChangesAction.abortEditing}
			/>
		{/snippet}
	</OnCanvas>
	<Canvas uiState={$canvasViewModel}></Canvas>
	<Sidebar
		cookieLoggedIn={data.loggedIn}
		uiState={$sidebarViewModel}
		disabled={addingComponent}
		simulating={editorViewModel.uiState.matches({ mode: "simulate" })}
	></Sidebar>
	{#if $circuitModalViewModel.mode !== null}
		<CircuitModal uiState={$circuitModalViewModel}></CircuitModal>
	{/if}
</div>

<script lang="ts">
	import Canvas from "$lib/components/editor/Canvas.svelte";
	import OnCanvas from "$lib/components/editor/overlay/OnCanvas.svelte";
	import ThemeSwitcher from "$lib/components/editor/overlay/sidebars/ThemeSwitcher.svelte";
	import CircuitModal from "$lib/components/modal/CircuitModal.svelte";
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

		if (
			uiState.matches({
				selectionInProgressFor: P.number,
			})
		) {
			// An element wants to change the selection
			const selected = "selected" in uiState ? uiState.selected : null;
			if (uiState.selectionInProgressFor === selected) {
				// The element is already selected
				if (uiState.matches({ hasMoved: false })) {
					// The element was already selected and only clicked
					// -> deselect it
					editorViewModel.clearSelection();
				} else {
					// A selected element was moved
					// -> keep selection and do nothing
				}
			} else {
				// The element is not selected yet
				editorViewModel.setSelected(uiState.selectionInProgressFor);
			}
		}

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

		if (uiState.matches({ editType: "draggingWireMiddle" })) {
			// The middle of a wire was dragged/clicked
			// -> currently unimplemented
			console.warn("Dragging wire middle is not implemented yet");
			// undo any changes possibly made while dragging
			ChangesAction.abortEditing();
			return;
		}

		// commit the changes that were made while dragging
		ChangesAction.commitChanges();
	}
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<OnCanvas uiState={editorViewModel.uiState}></OnCanvas>
	<Canvas uiState={$canvasViewModel}></Canvas>

	<ThemeSwitcher />

	{#if $circuitModalViewModel.mode !== null}
		<CircuitModal uiState={$circuitModalViewModel}></CircuitModal>
	{/if}
</div>

<style>
</style>

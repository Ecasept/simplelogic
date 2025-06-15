<script lang="ts">
	import Canvas from "$lib/components/editor/Canvas.svelte";
	import OnCanvas from "$lib/components/editor/overlay/OnCanvas.svelte";
	import CircuitModal from "$lib/components/modal/CircuitModal.svelte";
	import {
		canvasViewModel,
		ChangesAction,
		circuitModalViewModel,
		EditorAction,
		editorViewModel,
		graphManager,
	} from "$lib/util/actions";
	import {
		debugLog,
		mousePosition,
		setMousePosition,
	} from "$lib/util/global.svelte";
	import { handleKeyDown } from "$lib/util/keyboard";
	import { cancelLongPress, cancelLongPressIfMoved } from "$lib/util/longpress";
	import { getThemeClass } from "$lib/util/theme.svelte";
	import { authViewModel } from "$lib/util/viewModels/authViewModel";
	import { onMount } from "svelte";
	import { P } from "ts-pattern";

	let { data }: { data: import("./$types").LayoutData } = $props();
	let themeClass = $derived.by(getThemeClass);

	onMount(() => {
		// Check if there is a circuit in the session storage from a previous sign in
		const sessionCircuit = sessionStorage.getItem("currentCircuit");
		if (sessionCircuit) {
			// If there is, load it into the editor
			const circuit = JSON.parse(sessionCircuit);
			graphManager.setGraphData(circuit);
			graphManager.notifyAll();
			sessionStorage.removeItem("currentCircuit");
			console.log("Loaded circuit from session storage");
		}
	});

	$inspect(editorViewModel.uiState).with(debugLog("UISTATE"));

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

		if (uiState.matches({ isPanning: true })) {
			console.warn("Panning should be handled by the canvas component");
			return;
		}

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

		if (
			uiState.matches({ editType: P.union("draggingWire", "addingWire") }) &&
			uiState.hoveredHandle !== null
		) {
			// A wire is being dragged, and it is hovering over a handle
			// -> connect the wire to the handle
			EditorAction.connect(
				$state.snapshot(uiState.draggedHandle),
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

		if (
			uiState.matches({
				mode: "edit",
				editType: P.union("addingComponent", "addingWire"),
			}) ||
			uiState.matches({
				mode: "edit",
				editType: P.union("draggingComponent", "draggingWire"),
				hasMoved: true,
			})
		) {
			// The user is adding a component or wire, or dragging a component or wire
			// and the element has actually been moved (it wasn't just a click)
			// -> commit the changes
			ChangesAction.commitChanges();
		} else if (
			uiState.matches({
				mode: "edit",
				editType: P.union("draggingComponent", "draggingWire"),
				hasMoved: false,
			})
		) {
			// The user is dragging a component or wire, but the element hasn't been moved
			// so this was only a click
			// -> undo the changes made while dragging in order to effectively have done nothing
			ChangesAction.abortEditing();
		}
	}
</script>

<svelte:window
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<OnCanvas uiState={editorViewModel.uiState} authUiState={$authViewModel}
	></OnCanvas>
	<Canvas uiState={$canvasViewModel}></Canvas>

	{#if $circuitModalViewModel.mode !== null}
		<CircuitModal uiState={$circuitModalViewModel}></CircuitModal>
	{/if}
</div>

<style>
</style>

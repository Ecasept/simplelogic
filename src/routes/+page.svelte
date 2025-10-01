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
		MoveAction,
		PersistenceAction,
	} from "$lib/util/actions.svelte";
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
		const source = sessionStorage.getItem("signInSource");
		if (source) {
			sessionStorage.removeItem("signInSource");
			switch (source) {
				case "saveModal":
					PersistenceAction.saveGraph();
					break;
				case "loadModal":
					PersistenceAction.loadGraph();
					break;
				case "authPopup":
					authViewModel.toggleOpen();
					break;
			}
		}

		const storedSettings = localStorage.getItem("editorSettings");
		if (storedSettings) {
			try {
				const settings = JSON.parse(storedSettings);
				editorViewModel.applySettings(settings);
			} catch (e) {
				console.error("Failed to parse stored settings:", e);
			}
		}
	});

	$inspect(editorViewModel.uiState).with(debugLog("UISTATE"));

	function updatePosition(e: PointerEvent) {
		const pos = { x: e.clientX, y: e.clientY };
		setMousePosition(pos);

		const svgPos = canvasViewModel.clientToSVGCoords(pos);

		MoveAction.onMove(svgPos);
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
		} else if (uiState.matches({ editType: "addingComponent" })) {
			// Select the component that was added
			const clickedElement = $state.snapshot(uiState.clickedElement);
			editorViewModel.setSelected(clickedElement);
			// Complete the adding of the component
			ChangesAction.commitChanges();
		} else if (
			uiState.matches({
				editType: P.union("draggingWireHandle", "addingWire"),
			})
		) {
			if (uiState.hoveredHandle === null) {
				// The wire was dragged but not connected to a handle

				const handle = $state.snapshot(uiState.draggedHandle);
				editorViewModel.setSelected(handle);
				ChangesAction.commitChanges();
			} else {
				// We're currently dragging a wire and hovering over another handle
				// -> connect them
				EditorAction.connect(
					$state.snapshot(uiState.draggedHandle),
					$state.snapshot(uiState.hoveredHandle),
				);
				editorViewModel.removeHoveredHandle();
				const handle = $state.snapshot(uiState.draggedHandle);
				editorViewModel.setSelected(handle);
				// Commit the changes made while dragging the wire
				ChangesAction.commitChanges();
			}
		} else if (uiState.matches({ editType: "elementDown" })) {
			const clickedElement = $state.snapshot(uiState.clickedElement);

			if (uiState.clickType === "ctrl") {
				// Ctrl+click: toggle selection
				if (editorViewModel.isSelected(clickedElement)) {
					editorViewModel.removeSelected(clickedElement);
				} else {
					editorViewModel.addSelected(clickedElement);
				}
			} else {
				if (
					editorViewModel.getSelectedCount() == 1 &&
					editorViewModel.isSelected(clickedElement)
				) {
					// If the clicked element is the only selected element,
					// toggle the selection
					editorViewModel.removeSelected(clickedElement);
				} else {
					// Set it as the selected element
					editorViewModel.setSelected(clickedElement);
				}
			}
			// Return to idle state
			ChangesAction.abortEditing();
		} else if (uiState.matches({ editType: "wireHandleDown" })) {
			// A wire handle was clicked
			const clickedHandle = $state.snapshot(uiState.clickedHandle);
			if (uiState.clickType === "ctrl") {
				// Ctrl+click: toggle selection
				if (editorViewModel.isSelected(clickedHandle)) {
					editorViewModel.removeSelected(clickedHandle);
				} else {
					editorViewModel.addSelected(clickedHandle);
				}
			} else {
				if (
					editorViewModel.getSelectedCount() == 1 &&
					editorViewModel.isSelected(clickedHandle)
				) {
					// If the clicked handle is the only selected element,
					// toggle the selection
					editorViewModel.removeSelected(clickedHandle);
				} else {
					// Set it as the selected element
					editorViewModel.setSelected(clickedHandle);
				}
			}
			// Return to idle state
			ChangesAction.abortEditing();
		} else if (
			uiState.matches({
				editType: "draggingElements",
			})
		) {
			// An element was dragged
			const clickedElement = $state.snapshot(uiState.clickedElement);
			if (editorViewModel.isSelected(clickedElement)) {
				// A selected element was moved
				// -> do nothing, as it is already selected
			} else {
				// An unselected element was dragged
				// -> set it as the only selected element
				editorViewModel.setSelected(clickedElement);
			}
			// Commit the changes made while dragging the elements
			ChangesAction.commitChanges();
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

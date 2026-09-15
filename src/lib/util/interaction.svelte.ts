import { P } from "ts-pattern";
import type {
	AddAction as AddActions,
	ChangesAction as ChangeActions,
	EditorAction as EditorActions,
	MoveAction as MoveActions,
} from "./actions.svelte";
import type { GraphManager } from "./graph.svelte";
import type { EditorViewModel } from "./viewModels/editorViewModel.svelte";
import type { CanvasViewModel, ViewBox } from "./viewModels/canvasViewModel";
import type { XYPair } from "./types";
import {
	isVibrateSupported,
	PAN_THRESHOLD,
	setMousePosition,
} from "./global.svelte";
import {
	cancelLongPress,
	cancelLongPressIfMoved,
	startLongPressTimer,
} from "./longpress";

/** DOM adapters forward values; interaction decisions never depend on event propagation. */
export type PointerInput = {
	pointerId: number;
	clientX: number;
	clientY: number;
	button: number;
	shiftKey: boolean;
};

export function normalizePointer(event: PointerEvent): PointerInput {
	return {
		pointerId: event.pointerId,
		clientX: event.clientX,
		clientY: event.clientY,
		button: event.button,
		shiftKey: event.shiftKey,
	};
}

type Dependencies = {
	graphManager: GraphManager;
	editorViewModel: EditorViewModel;
	canvasViewModel: CanvasViewModel;
	AddAction: typeof AddActions;
	ChangesAction: typeof ChangeActions;
	EditorAction: typeof EditorActions;
	MoveAction: typeof MoveActions;
};
type Gesture =
	| { kind: "idle" }
	| { kind: "pan"; originalViewBox: ViewBox; moveAmount: number }
	| { kind: "area"; pointerId: number; startPos: XYPair; currentPos: XYPair };

/** Owns gesture state, pointer completion, and all interaction cancellation. */
export function createInteractionController(deps: Dependencies) {
	const {
		graphManager,
		editorViewModel,
		canvasViewModel,
		AddAction,
		ChangesAction,
		EditorAction,
		MoveAction,
	} = deps;
	let gesture = $state<Gesture>({ kind: "idle" });
	const pointers = new Map<number, PointerInput>();

	function position(e: PointerInput) {
		return { x: e.clientX, y: e.clientY };
	}
	function updatePosition(e: PointerInput) {
		const pos = position(e);
		setMousePosition(pos);
		MoveAction.onMove(canvasViewModel.clientToSVGCoords(pos), e.pointerId);
	}

	function stopGesture() {
		cancelLongPress();
		pointers.clear();
		gesture = { kind: "idle" };
		editorViewModel.stopPanning();
	}

	function cancel() {
		if (gesture.kind === "pan")
			canvasViewModel.setViewBox(gesture.originalViewBox);
		stopGesture();
		graphManager.discardChanges();
		editorViewModel.abortEditing();
		editorViewModel.removeHoveredHandle();
	}

	function pointerCancel(e: PointerInput) {
		const state = editorViewModel.uiState;
		if (
			pointers.has(e.pointerId) ||
			(gesture.kind === "area" && gesture.pointerId === e.pointerId) ||
			("activePointerId" in state && state.activePointerId === e.pointerId)
		)
			cancel();
	}

	function beginAreaSelection(e: PointerInput) {
		stopGesture();
		const pos = canvasViewModel.clientToSVGCoords(position(e));
		gesture = {
			kind: "area",
			pointerId: e.pointerId,
			startPos: pos,
			currentPos: pos,
		};
		editorViewModel.startAreaSelection();
	}

	function canvasPointerDown(e: PointerInput) {
		if (e.button !== 0 || editorViewModel.uiState.isModalOpen) return;
		const state = editorViewModel.uiState;
		if (gesture.kind === "area") return;
		if (
			!(
				state.matches({ mode: P.union("simulate", "delete") }) ||
				state.matches({ editType: "idle" })
			)
		)
			return;
		if (state.matches({ editType: "idle", isPanning: false }) && e.shiftKey) {
			beginAreaSelection(e);
			return;
		}
		if (pointers.has(e.pointerId) || pointers.size === 2) return;
		pointers.set(e.pointerId, e);
		if (pointers.size === 1) {
			gesture = {
				kind: "pan",
				originalViewBox: { ...canvasViewModel.uiState.viewBox },
				moveAmount: 0,
			};
			editorViewModel.startPanning();
			if (state.matches({ editType: "idle" })) {
				startLongPressTimer(position(e), () => {
					beginAreaSelection(e);
					if (isVibrateSupported()) navigator.vibrate(10);
				});
			}
		} else cancelLongPress();
	}

	function pointerMove(e: PointerInput) {
		cancelLongPressIfMoved(position(e));
		if (gesture.kind === "area") {
			if (gesture.pointerId === e.pointerId)
				gesture.currentPos = canvasViewModel.clientToSVGCoords(position(e));
			return;
		}
		const old = pointers.get(e.pointerId);
		if (gesture.kind === "pan" && old) {
			pointers.set(e.pointerId, e);
			let dx = e.clientX - old.clientX;
			let dy = e.clientY - old.clientY;
			if (pointers.size === 2) {
				const other = [...pointers.values()].find(
					(p) => p.pointerId !== e.pointerId,
				)!;
				const distance = Math.hypot(
					e.clientX - other.clientX,
					e.clientY - other.clientY,
				);
				const oldDistance = Math.hypot(
					old.clientX - other.clientX,
					old.clientY - other.clientY,
				);
				if (distance > 0 && oldDistance > 0)
					canvasViewModel.zoom(oldDistance / distance, {
						x: (e.clientX + other.clientX) / 2,
						y: (e.clientY + other.clientY) / 2,
					});
				dx /= 2;
				dy /= 2;
			}
			canvasViewModel.pan(dx, dy);
			gesture.moveAmount += Math.hypot(dx, dy);
			setMousePosition(position(e));
			return;
		}
		updatePosition(e);
	}

	function pointerUp(e: PointerInput) {
		cancelLongPress();
		if (gesture.kind === "area") {
			if (gesture.pointerId !== e.pointerId) return;
			const start = gesture.startPos;
			const end = canvasViewModel.clientToSVGCoords(position(e));
			const selected = graphManager.getElementsInArea(
				start,
				end,
				editorViewModel.uiState.settings.areaSelectType,
			);
			stopGesture();
			editorViewModel.setSelectedElements(selected);
			return;
		}
		if (gesture.kind === "pan") {
			if (!pointers.has(e.pointerId)) return;
			pointerMove(e);
			pointers.delete(e.pointerId);
			if (pointers.size === 0) {
				if (gesture.moveAmount < PAN_THRESHOLD)
					editorViewModel.clearSelection();
				stopGesture();
			}
			return;
		}
		finishEditing(e);
	}

	function wheel(deltaY: number, clientPos: XYPair) {
		canvasViewModel.zoom(deltaY > 0 ? 1.1 : 0.9, clientPos);
	}

	function finishEditing(e: PointerInput) {
		// on touch screens, no pointer move events are emitted for adding components
		// so we need to update the position here
		updatePosition(e);
		const uiState = editorViewModel.uiState;

		cancelLongPress();

		if (
			uiState.mode === "edit" &&
			uiState.editType === "addingElements" &&
			uiState.activePointerId === e.pointerId
		) {
			editorViewModel.setSelectedElements(uiState.elements);
			ChangesAction.commitChanges();
		} else if (
			uiState.mode === "edit" &&
			uiState.editType === "addingComponent" &&
			uiState.activePointerId === e.pointerId
		) {
			// Select the component that was added
			const clickedElement = $state.snapshot(uiState.clickedElement);
			editorViewModel.setSelected(clickedElement);
			// Complete the adding of the component
			ChangesAction.commitChanges();

			if (
				uiState.matches({
					settings: {
						continuousPlacement: true,
					},
					initiator: "keyboard",
				})
			) {
				// If continuous placement is enabled, start adding another component of the same type
				AddAction.addComponent(
					graphManager.getComponentData(clickedElement.id).type,
					{ x: e.clientX, y: e.clientY },
					"keyboard",
					e.pointerId,
				);
			}
		} else if (
			uiState.matches({
				editType: P.union("draggingWireHandle", "addingWire"),
				activePointerId: e.pointerId,
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
		} else if (
			uiState.matches({ editType: "elementDown", activePointerId: e.pointerId })
		) {
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
		} else if (
			uiState.matches({
				editType: "wireHandleDown",
				activePointerId: e.pointerId,
			})
		) {
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
				activePointerId: e.pointerId,
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

	return {
		get gesture() {
			return gesture;
		},
		canvasPointerDown,
		pointerMove,
		pointerUp,
		pointerCancel,
		cancel,
		wheel,
	};
}

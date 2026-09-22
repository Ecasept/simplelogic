import {
	CommandGroup,
	ConnectCommand,
	CreateComponentCommand,
	CreateWireCommand,
	MoveWireHandleCommand,
	type Command,
} from "../graph/commands";
import {
	calculateHandlePosition,
	constructComponent,
	gridSnap,
	isVibrateSupported,
	PAN_THRESHOLD,
	setMousePosition,
} from "../shared/global.svelte";
import {
	cancelLongPress,
	cancelLongPressIfMoved,
	startLongPressTimer,
} from "./longpress";
import { planMove, type MoveTargets } from "./move";
import {
	newWireHandleRef,
	type ComponentType,
	type HandleReference,
	type WireHandleReference,
	type XYPair,
} from "../shared/types";
import type { GraphManager } from "../graph/graph.svelte";
import type {
	EditorViewModel,
	ElementType,
	TypedReference,
} from "../editor/editorViewModel.svelte";
import type { CanvasViewModel, ViewBox } from "./canvasViewModel.svelte";
import type {
	EditInteraction,
	InteractionState,
	MovementSession,
	PointerInput,
} from "./interactionTypes";
export type { PointerInput } from "./interactionTypes";

export function normalizePointer(event: PointerEvent): PointerInput {
	return {
		pointerId: event.pointerId,
		clientX: event.clientX,
		clientY: event.clientY,
		button: event.button,
		shiftKey: event.shiftKey,
	};
}

type EditSession = Exclude<EditInteraction, { kind: "idle" }> & {
	movement?: MovementSession;
};
type Session =
	| EditSession
	| { kind: "idle" }
	| {
			kind: "pan";
			pointers: Map<number, PointerInput>;
			originalViewBox: ViewBox;
			moveAmount: number;
	  }
	| { kind: "area"; pointerId: number; startPos: XYPair; currentPos: XYPair };

type Dependencies = {
	graphManager: GraphManager;
	editorViewModel: EditorViewModel;
	canvasViewModel: CanvasViewModel;
};

/** The single owner of active interaction state, movement snapshots and pointer lifetime. */
export function createInteractionController({
	graphManager,
	editorViewModel,
	canvasViewModel,
}: Dependencies) {
	// Raw state keeps graph snapshots, Maps and transaction instances out of Svelte proxies.
	// Every state change publishes a replacement session.
	let session = $state.raw<Session>({ kind: "idle" });
	const state = $derived.by((): Readonly<InteractionState> => {
		if (session.kind === "pan") {
			return { kind: "pan" };
		}
		if ("movement" in session) {
			const { movement, ...view } = session;
			return structuredClone(view);
		}
		return structuredClone(session);
	});

	function position(e: PointerInput) {
		return { x: e.clientX, y: e.clientY };
	}
	function copyPoint(point: XYPair) {
		return { x: point.x, y: point.y };
	}
	function movementTargets(clicked: TypedReference, draggingSelected = false) {
		if (draggingSelected) {
			return new Map(editorViewModel.uiState.selected);
		}
		const targets = new Map<number, ElementType>();
		targets.set(clicked.id, clicked.type);
		return targets;
	}
	function canStartEdit() {
		return (
			editorViewModel.uiState.mode === "edit" &&
			!editorViewModel.isBlocked &&
			session.kind === "idle"
		);
	}
	function clearSession() {
		cancelLongPress();
		session = { kind: "idle" };
	}
	function cancel() {
		if (session.kind === "pan") {
			canvasViewModel.setViewBox(session.originalViewBox);
		}
		clearSession();
		graphManager.discardChanges();
		editorViewModel.removeHoveredHandle();
	}
	function commit() {
		graphManager.applyChanges();
		clearSession();
	}
	function pointerCancel(e: PointerInput) {
		if (
			(session.kind === "pan" && session.pointers.has(e.pointerId)) ||
			(session.kind === "area" && session.pointerId === e.pointerId) ||
			("activePointerId" in session && session.activePointerId === e.pointerId)
		) {
			cancel();
		}
	}

	function elementPointerDown(
		clickedElement: TypedReference,
		clickPosition: XYPair,
		clickType: "ctrl" | "none",
		activePointerId: number,
	) {
		if (!canStartEdit()) {
			return;
		}
		session = {
			kind: "elementDown",
			clickedElement: { ...clickedElement },
			clickPosition: copyPoint(clickPosition),
			clickType,
			activePointerId,
		};
	}
	function wireHandlePointerDown(
		clickedHandle: WireHandleReference,
		clickPosition: XYPair,
		connectionCount: number,
		clickType: "ctrl" | "none",
		activePointerId: number,
	) {
		if (!canStartEdit()) {
			return;
		}
		session = {
			kind: "wireHandleDown",
			clickedHandle: { ...clickedHandle },
			clickPosition: copyPoint(clickPosition),
			connectionCount,
			clickType,
			activePointerId,
		};
	}

	function addComponent(
		type: ComponentType,
		clickPos: XYPair,
		initiator: "drag" | "keyboard",
		activePointerId: number | null,
	) {
		if (editorViewModel.uiState.mode !== "edit" || editorViewModel.isBlocked) {
			return;
		}
		cancel();
		const clickPosition = canvasViewModel.clientToSVGCoords(clickPos);
		const id = graphManager.executeCommand(
			new CreateComponentCommand(constructComponent(type, clickPosition)),
		);
		session = {
			kind: "addingComponent",
			clickedElement: { id, type: "component" },
			clickPosition: { x: clickPosition.x, y: clickPosition.y },
			initiator,
			activePointerId,
		};
		if (activePointerId !== null) {
			moveEditing(clickPosition, activePointerId);
		}
	}

	function addElements(
		elements: Map<number, ElementType>,
		clickPosition: XYPair,
		command: Command,
	) {
		if (editorViewModel.uiState.mode !== "edit" || editorViewModel.isBlocked) {
			return;
		}
		cancel();
		graphManager.executeCommand(command);
		session = {
			kind: "addingElements",
			elements: new Map(elements),
			clickPosition: copyPoint(clickPosition),
			activePointerId: null,
		};
	}

	function addWire(
		clickPosition: XYPair,
		clickedHandle: HandleReference,
		activePointerId: number,
	) {
		if (editorViewModel.uiState.mode !== "edit" || editorViewModel.isBlocked) {
			return;
		}
		cancel();
		const createWire = new CreateWireCommand({
			handles: {
				input: { ...copyPoint(clickPosition), type: "input", connections: [] },
				output: {
					...copyPoint(clickPosition),
					type: "output",
					connections: [],
				},
			},
		});
		const wireId = graphManager.executeCommand(createWire);
		const connectedHandle = newWireHandleRef(
			wireId,
			clickedHandle.handleType === "input" ? "output" : "input",
		);
		graphManager.executeCommand(
			new ConnectCommand(connectedHandle, clickedHandle),
		);
		session = {
			kind: "addingWire",
			draggedHandle: newWireHandleRef(wireId, clickedHandle.handleType),
			clickPosition: copyPoint(clickPosition),
			connectionCount: 0,
			activePointerId,
		};
		moveEditing(clickPosition, activePointerId);
	}

	function previewMove(
		current: EditSession,
		offset: XYPair,
		targets: MoveTargets,
	) {
		const edit = graphManager.currentEdit ?? graphManager.beginEdit();
		const graph = graphManager.getGraphData();
		let movement = current.movement;
		if (!movement || movement.edit !== edit) {
			movement = { edit, origin: $state.snapshot(graph) };
		}
		const next = { ...current, movement };
		session = next;
		const plan = planMove(graph, movement.origin, targets, offset, gridSnap);
		if (plan.changed) {
			movement.edit.replacePreview(plan.command);
		}
		return { next, moved: plan.changed };
	}

	function moveEditing(svgPosition: XYPair, pointerId: number) {
		if (!("activePointerId" in session)) {
			return;
		}
		if (
			session.activePointerId !== null &&
			session.activePointerId !== pointerId
		) {
			return;
		}
		const current = { ...session, activePointerId: pointerId };
		const offset = {
			x: svgPosition.x - current.clickPosition.x,
			y: svgPosition.y - current.clickPosition.y,
		};
		switch (current.kind) {
			case "addingComponent":
				previewMove(current, offset, movementTargets(current.clickedElement));
				break;
			case "addingElements":
				previewMove(current, offset, current.elements);
				break;
			case "elementDown": {
				const draggingSelected = editorViewModel.isSelected(
					current.clickedElement,
				);
				const targets = movementTargets(
					current.clickedElement,
					draggingSelected,
				);
				const { next, moved } = previewMove(current, offset, targets);
				if (moved) {
					session = {
						kind: "draggingElements",
						clickedElement: current.clickedElement,
						clickPosition: current.clickPosition,
						activePointerId: pointerId,
						draggingSelected,
						movement: next.movement,
					};
				}
				break;
			}
			case "draggingElements": {
				const targets = movementTargets(
					current.clickedElement,
					current.draggingSelected,
				);
				previewMove(current, offset, targets);
				break;
			}
			case "wireHandleDown": {
				const { next, moved } = previewMove(
					current,
					offset,
					current.clickedHandle,
				);
				if (moved) {
					session = {
						kind: "draggingWireHandle",
						draggedHandle: current.clickedHandle,
						clickPosition: current.clickPosition,
						connectionCount: current.connectionCount,
						activePointerId: pointerId,
						movement: next.movement,
					};
				}
				break;
			}
			case "draggingWireHandle":
			case "addingWire":
				previewMove(current, offset, current.draggedHandle);
				break;
		}
	}

	function beginAreaSelection(e: PointerInput) {
		cancelLongPress();
		const pos = canvasViewModel.clientToSVGCoords(position(e));
		session = {
			kind: "area",
			pointerId: e.pointerId,
			startPos: { x: pos.x, y: pos.y },
			currentPos: { x: pos.x, y: pos.y },
		};
	}
	function canvasPointerDown(e: PointerInput) {
		if (e.button !== 0 || editorViewModel.isBlocked) {
			return;
		}
		if (session.kind !== "idle" && session.kind !== "pan") {
			return;
		}
		if (
			session.kind === "idle" &&
			editorViewModel.uiState.mode === "edit" &&
			e.shiftKey
		) {
			beginAreaSelection(e);
			return;
		}
		if (session.kind === "idle") {
			session = {
				kind: "pan",
				pointers: new Map([[e.pointerId, e]]),
				originalViewBox: { ...canvasViewModel.uiState.viewBox },
				moveAmount: 0,
			};
			if (editorViewModel.uiState.mode === "edit") {
				startLongPressTimer(position(e), () => {
					if (session.kind !== "pan" || !session.pointers.has(e.pointerId)) {
						return;
					}
					beginAreaSelection(e);
					if (isVibrateSupported()) {
						navigator.vibrate(10);
					}
				});
			}
		} else if (
			!session.pointers.has(e.pointerId) &&
			session.pointers.size < 2
		) {
			session = {
				...session,
				pointers: new Map(session.pointers).set(e.pointerId, e),
			};
			cancelLongPress();
		}
	}

	function pointerMove(e: PointerInput) {
		cancelLongPressIfMoved(position(e));
		setMousePosition(position(e));
		if (session.kind === "area") {
			if (session.pointerId === e.pointerId) {
				const pos = canvasViewModel.clientToSVGCoords(position(e));
				session = { ...session, currentPos: { x: pos.x, y: pos.y } };
			}
			return;
		}
		if (session.kind === "pan") {
			const old = session.pointers.get(e.pointerId);
			if (!old) {
				return;
			}
			const pointers = new Map(session.pointers).set(e.pointerId, e);
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
				if (distance > 0 && oldDistance > 0) {
					canvasViewModel.zoom(oldDistance / distance, {
						x: (e.clientX + other.clientX) / 2,
						y: (e.clientY + other.clientY) / 2,
					});
				}
				dx /= 2;
				dy /= 2;
			}
			canvasViewModel.pan(dx, dy);
			session = {
				...session,
				pointers,
				moveAmount: session.moveAmount + Math.hypot(dx, dy),
			};
			return;
		}
		if ("activePointerId" in session) {
			moveEditing(canvasViewModel.clientToSVGCoords(position(e)), e.pointerId);
		}
	}

	function connect(conn1: HandleReference, conn2: HandleReference) {
		let pos: XYPair;
		if (conn2.type === "component") {
			const cmp = graphManager.getComponentData(conn2.id);
			const handle = cmp.handles[conn2.handleId];
			pos = calculateHandlePosition(
				handle.edge,
				handle.pos,
				cmp.size,
				cmp.position,
				cmp.rotation,
				true,
			);
		} else {
			const handle = graphManager.getWireData(conn2.id).handles[conn2.handleId];
			pos = { x: handle.x, y: handle.y };
		}
		const commands = [
			new MoveWireHandleCommand(pos, conn1.handleType, conn1.id),
			new ConnectCommand(conn1, conn2),
		];
		const group = new CommandGroup(commands, "connect");
		graphManager.executeCommand(group);
	}

	function selectClicked(clicked: TypedReference, clickType: "ctrl" | "none") {
		if (clickType === "ctrl") {
			if (editorViewModel.isSelected(clicked)) {
				editorViewModel.removeSelected(clicked);
			} else {
				editorViewModel.addSelected(clicked);
			}
		} else if (
			editorViewModel.getSelectedCount() === 1 &&
			editorViewModel.isSelected(clicked)
		) {
			editorViewModel.removeSelected(clicked);
		} else {
			editorViewModel.setSelected(clicked);
		}
	}

	function pointerUp(e: PointerInput) {
		cancelLongPress();
		// Apply the final position first: it may turn a pending press into a drag.
		pointerMove(e);
		if (session.kind === "area") {
			if (session.pointerId !== e.pointerId) {
				return;
			}
			const selected = graphManager.getElementsInArea(
				session.startPos,
				session.currentPos,
				editorViewModel.uiState.settings.areaSelectType,
			);
			clearSession();
			editorViewModel.setSelectedElements(selected);
			return;
		}
		if (session.kind === "pan") {
			if (!session.pointers.has(e.pointerId)) {
				return;
			}
			const pointers = new Map(session.pointers);
			pointers.delete(e.pointerId);
			if (pointers.size === 0) {
				if (
					session.moveAmount < PAN_THRESHOLD &&
					editorViewModel.uiState.mode === "edit"
				) {
					editorViewModel.clearSelection();
				}
				clearSession();
			} else {
				session = { ...session, pointers };
			}
			return;
		}
		if (
			!("activePointerId" in session) ||
			session.activePointerId !== e.pointerId
		) {
			return;
		}
		const current = session;
		switch (current.kind) {
			case "addingElements":
				editorViewModel.setSelectedElements(current.elements);
				commit();
				break;
			case "addingComponent": {
				const type = graphManager.getComponentData(
					current.clickedElement.id,
				).type;
				editorViewModel.setSelected(current.clickedElement);
				commit();
				if (
					current.initiator === "keyboard" &&
					editorViewModel.uiState.settings.continuousPlacement
				) {
					addComponent(type, position(e), "keyboard", null);
				}
				break;
			}
			case "addingWire":
			case "draggingWireHandle": {
				const hovered = editorViewModel.uiState.hoveredHandle;
				if (hovered) {
					connect(current.draggedHandle, hovered);
				}
				editorViewModel.removeHoveredHandle();
				editorViewModel.setSelected(current.draggedHandle);
				commit();
				break;
			}
			case "elementDown":
				selectClicked(current.clickedElement, current.clickType);
				cancel();
				break;
			case "wireHandleDown":
				selectClicked(current.clickedHandle, current.clickType);
				cancel();
				break;
			case "draggingElements":
				if (!editorViewModel.isSelected(current.clickedElement)) {
					editorViewModel.setSelected(current.clickedElement);
				}
				commit();
				break;
		}
	}

	function wheel(deltaY: number, clientPos: XYPair) {
		if (!Number.isFinite(deltaY) || deltaY === 0) return;
		canvasViewModel.zoom(deltaY > 0 ? 1.04 : 1 / 1.04, clientPos);
	}

	return {
		get state() {
			return state;
		},
		get canStartElementInteraction() {
			return canStartEdit();
		},
		canvasPointerDown,
		elementPointerDown,
		wireHandlePointerDown,
		pointerMove,
		pointerUp,
		pointerCancel,
		cancel,
		commit,
		wheel,
		addComponent,
		addWire,
		addElements,
	};
}

export type InteractionController = ReturnType<
	typeof createInteractionController
>;

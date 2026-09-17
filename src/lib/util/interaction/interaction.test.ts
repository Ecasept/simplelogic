import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	canvasViewModel,
	editorViewModel,
	graphManager,
	interactionController as controller,
	editorUiState,
	graphActions,
	modeActions,
	persistenceActions,
} from "../editor/editor.svelte";
import { handleKeyDown } from "../editor/keyboard";
import { LONG_PRESS_MS } from "../shared/global.svelte";
import type { PointerInput } from "./interaction.svelte";

const pointer = (
	pointerId = 1,
	clientX = 100,
	clientY = 100,
	shiftKey = false,
): PointerInput => ({ pointerId, clientX, clientY, shiftKey, button: 0 });

beforeEach(() => {
	controller.cancel();
	editorViewModel.hardReset();
	graphManager.clear();
	canvasViewModel.setViewBox({ x: 0, y: 0, width: 1000, height: 1000 });
	vi.spyOn(canvasViewModel, "clientToSVGCoords").mockImplementation(
		(pos) => pos as DOMPoint,
	);
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
	controller.cancel();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("interaction lifecycle", () => {
	it("commits placement only for its pointer, using release coordinates", () => {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		controller.pointerUp(pointer(2, 200, 200));
		expect(graphManager.currentEdit).not.toBeNull();
		controller.pointerUp(pointer(1, 200, 200));
		expect(graphManager.currentEdit).toBeNull();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(1);
		expect(editorUiState.current.matches({ mode: "edit", kind: "idle" })).toBe(
			true,
		);
		graphManager.undoLastCommand();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
	});

	it("ignores unrelated pointer cancellation and rolls back the owning pointer", () => {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		controller.pointerCancel(pointer(2));
		expect(graphManager.currentEdit).not.toBeNull();
		controller.pointerCancel(pointer(1));
		expect(graphManager.currentEdit).toBeNull();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
		controller.pointerUp(pointer(1));
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
	});

	it("continues keyboard placement after a successful release", () => {
		editorViewModel.applySettings({ continuousPlacement: true });
		controller.addComponent("AND", { x: 100, y: 100 }, "keyboard", null);
		controller.pointerUp(pointer());
		expect(editorUiState.current.matches({ kind: "addingComponent" })).toBe(
			true,
		);
		controller.cancel();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(1);
	});

	it("cancels pending clicks through Escape", async () => {
		controller.elementPointerDown(
			{ id: 0, type: "component" },
			{ x: 100, y: 100 },
			"none",
			1,
		);
		await handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(editorUiState.current.matches({ mode: "edit", kind: "idle" })).toBe(
			true,
		);
	});
});

describe("unified interaction ownership", () => {
	function placeComponent() {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		controller.pointerUp(pointer());
		return Object.values(graphManager.getGraphData().components)[0];
	}

	it("cannot start an element press while panning, or pan while dragging", () => {
		const component = placeComponent();
		controller.canvasPointerDown(pointer());
		controller.elementPointerDown(
			{ id: component.id, type: "component" },
			component.position,
			"none",
			2,
		);
		expect(controller.state.kind).toBe("pan");
		expect(controller.canStartElementInteraction).toBe(false);
		controller.cancel();
		controller.elementPointerDown(
			{ id: component.id, type: "component" },
			component.position,
			"none",
			1,
		);
		controller.pointerMove(pointer(1, 300, 300));
		expect(controller.state.kind).toBe("draggingElements");
		controller.canvasPointerDown(pointer(2));
		expect(controller.state.kind).toBe("draggingElements");
	});

	it("commits a drag whose only movement arrives with pointer-up, as one undo step", () => {
		const component = placeComponent();
		const origin = { ...component.position };
		controller.elementPointerDown(
			{ id: component.id, type: "component" },
			origin,
			"none",
			1,
		);
		controller.pointerUp(pointer(1, 300, 300));
		expect(controller.state.kind).toBe("idle");
		expect(graphManager.getComponentData(component.id).position).not.toEqual(
			origin,
		);
		graphActions.undo();
		expect(graphManager.getComponentData(component.id).position).toEqual(
			origin,
		);
		graphActions.undo();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
	});

	it("keeps the persistent model free of interaction state and hides session resources", () => {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		expect(controller.state.kind).toBe("addingComponent");
		expect(editorUiState.current.kind).toBe("addingComponent");
		expect(editorViewModel.uiState).not.toHaveProperty("kind");
		expect(editorViewModel.uiState).not.toHaveProperty("editType");
		expect(editorViewModel.uiState).not.toHaveProperty("isPanning");
		expect(controller.state).not.toHaveProperty("movement");
		expect(controller.state).not.toHaveProperty("origin");
		expect(controller.state).not.toHaveProperty("edit");
		expect(() => structuredClone(controller.state)).not.toThrow();
	});

	it("cancels an active transaction when switching mode", async () => {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		await modeActions.switchToDeleteMode();
		expect(controller.state.kind).toBe("idle");
		expect(graphManager.currentEdit).toBeNull();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
		expect(editorViewModel.uiState.mode).toBe("delete");
		controller.elementPointerDown(
			{ id: 0, type: "component" },
			{ x: 0, y: 0 },
			"none",
			1,
		);
		expect(controller.state.kind).toBe("idle");
		controller.pointerUp(pointer());
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
	});

	it("discards the old interaction when replacing the document", () => {
		controller.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		persistenceActions.setNewGraph({ components: {}, wires: {}, nextId: 9 });
		controller.pointerUp(pointer());
		expect(controller.state.kind).toBe("idle");
		expect(graphManager.currentEdit).toBeNull();
		expect(graphManager.getGraphData()).toEqual({
			components: {},
			wires: {},
			nextId: 9,
		});
	});

	it("captures a fresh movement origin for each drag", () => {
		const component = placeComponent();
		controller.elementPointerDown(
			{ id: component.id, type: "component" },
			component.position,
			"none",
			1,
		);
		controller.pointerUp(pointer(1, 300, 300));
		const firstPosition = {
			...graphManager.getComponentData(component.id).position,
		};
		controller.elementPointerDown(
			{ id: component.id, type: "component" },
			firstPosition,
			"none",
			2,
		);
		controller.pointerMove(pointer(2, 500, 500));
		controller.cancel();
		expect(graphManager.getComponentData(component.id).position).toEqual(
			firstPosition,
		);
		expect(controller.state.kind).toBe("idle");
	});

	it("survives implicit capture loss after committing continuous placement", () => {
		editorViewModel.applySettings({ continuousPlacement: true });
		controller.addComponent("AND", { x: 100, y: 100 }, "keyboard", null);
		controller.pointerUp(pointer());
		controller.pointerCancel(pointer());
		expect(controller.state.kind).toBe("addingComponent");
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(2);
		controller.cancel();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(1);
	});
});

describe("canvas gestures", () => {
	it("keeps panning until the last pointer releases", () => {
		controller.canvasPointerDown(pointer(1));
		controller.canvasPointerDown(pointer(2, 200, 100));
		controller.pointerMove(pointer(1, 80, 100));
		expect(canvasViewModel.uiState.viewBox.width).toBeLessThan(1000);
		controller.pointerUp(pointer(1, 80, 100));
		expect(controller.state.kind).toBe("pan");
		controller.pointerUp(pointer(2, 200, 100));
		expect(controller.state.kind).toBe("idle");
		expect(editorUiState.current.isCanvasGesture).toBe(false);
	});

	it("restores the viewport and clears pointer tracking on cancellation", () => {
		const original = { ...canvasViewModel.uiState.viewBox };
		controller.canvasPointerDown(pointer());
		controller.pointerMove(pointer(1, 200, 200));
		expect(canvasViewModel.uiState.viewBox).not.toEqual(original);
		controller.cancel();
		expect(canvasViewModel.uiState.viewBox).toEqual(original);
		controller.pointerMove(pointer(1, 300, 300));
		expect(canvasViewModel.uiState.viewBox).toEqual(original);
		expect(controller.state.kind).toBe("idle");
	});

	it("finishes selection only on its pointer and uses the final release position", () => {
		const select = vi
			.spyOn(graphManager, "getElementsInArea")
			.mockReturnValue(new Map([[42, "component"]]));
		controller.canvasPointerDown(pointer(1, 100, 100, true));
		controller.pointerMove(pointer(2, 800, 800));
		controller.pointerUp(pointer(2, 800, 800));
		expect(controller.state.kind).toBe("area");
		controller.pointerUp(pointer(1, 200, 250));
		expect(select).toHaveBeenCalledWith(
			{ x: 100, y: 100 },
			{ x: 200, y: 250 },
			editorUiState.current.settings.areaSelectType,
		);
		expect(editorViewModel.isSelectedId(42)).toBe(true);
		expect(controller.state.kind).toBe("idle");
	});

	it("cancels area selection without changing selection", async () => {
		editorViewModel.setSelected({ id: 42, type: "component" });
		const select = vi.spyOn(graphManager, "getElementsInArea");
		controller.canvasPointerDown(pointer(1, 100, 100, true));
		await handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
		controller.pointerUp(pointer(1, 200, 250));
		expect(select).not.toHaveBeenCalled();
		expect(editorViewModel.isSelectedId(42)).toBe(true);
		expect(controller.state.kind).toBe("idle");
	});

	it("does not leave a long press armed after cancellation or a second touch", () => {
		vi.useFakeTimers();
		vi.stubGlobal("matchMedia", () => ({ matches: false }));
		controller.canvasPointerDown(pointer());
		controller.cancel();
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.state.kind).toBe("idle");
		controller.canvasPointerDown(pointer());
		controller.canvasPointerDown(pointer(2, 200, 100));
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.state.kind).toBe("pan");
	});

	it("starts area selection on long press", () => {
		vi.useFakeTimers();
		vi.stubGlobal("matchMedia", () => ({ matches: false }));
		controller.canvasPointerDown(pointer());
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.state.kind).toBe("area");
		controller.pointerCancel(pointer());
		expect(controller.state.kind).toBe("idle");
	});

	it("keeps the viewport finite for coincident pinch pointers", () => {
		controller.canvasPointerDown(pointer(1));
		controller.canvasPointerDown(pointer(2));
		controller.pointerMove(pointer(1));
		expect(
			Object.values(canvasViewModel.uiState.viewBox).every(Number.isFinite),
		).toBe(true);
	});
});

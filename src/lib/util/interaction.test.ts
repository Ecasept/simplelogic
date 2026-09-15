import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	AddAction,
	ChangesAction,
	canvasViewModel,
	editorViewModel,
	graphManager,
	interactionController as controller,
} from "./actions.svelte";
import { handleKeyDown } from "./keyboard";
import { LONG_PRESS_MS } from "./global.svelte";
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
		AddAction.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
		controller.pointerUp(pointer(2, 200, 200));
		expect(graphManager.currentEdit).not.toBeNull();
		controller.pointerUp(pointer(1, 200, 200));
		expect(graphManager.currentEdit).toBeNull();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(1);
		expect(editorViewModel.uiState.matches({ editType: "idle" })).toBe(true);
		graphManager.undoLastCommand();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(0);
	});

	it("ignores unrelated pointer cancellation and rolls back the owning pointer", () => {
		AddAction.addComponent("AND", { x: 100, y: 100 }, "drag", 1);
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
		AddAction.addComponent("AND", { x: 100, y: 100 }, "keyboard", null);
		controller.pointerUp(pointer());
		expect(
			editorViewModel.uiState.matches({ editType: "addingComponent" }),
		).toBe(true);
		controller.cancel();
		expect(Object.keys(graphManager.getGraphData().components)).toHaveLength(1);
	});

	it("cancels pending clicks through Escape", async () => {
		editorViewModel.onElementDown(
			{ id: 0, type: "component" },
			{ x: 100, y: 100 },
			"none",
			1,
		);
		await handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(editorViewModel.uiState.matches({ editType: "idle" })).toBe(true);
	});
});

describe("canvas gestures", () => {
	it("keeps panning until the last pointer releases", () => {
		controller.canvasPointerDown(pointer(1));
		controller.canvasPointerDown(pointer(2, 200, 100));
		controller.pointerMove(pointer(1, 80, 100));
		expect(canvasViewModel.uiState.viewBox.width).toBeLessThan(1000);
		controller.pointerUp(pointer(1, 80, 100));
		expect(controller.gesture.kind).toBe("pan");
		controller.pointerUp(pointer(2, 200, 100));
		expect(controller.gesture.kind).toBe("idle");
		expect(editorViewModel.uiState.isPanning).toBe(false);
	});

	it("restores the viewport and clears pointer tracking on cancellation", () => {
		const original = { ...canvasViewModel.uiState.viewBox };
		controller.canvasPointerDown(pointer());
		controller.pointerMove(pointer(1, 200, 200));
		expect(canvasViewModel.uiState.viewBox).not.toEqual(original);
		ChangesAction.abortEditing();
		expect(canvasViewModel.uiState.viewBox).toEqual(original);
		controller.pointerMove(pointer(1, 300, 300));
		expect(canvasViewModel.uiState.viewBox).toEqual(original);
		expect(controller.gesture.kind).toBe("idle");
	});

	it("finishes selection only on its pointer and uses the final release position", () => {
		const select = vi
			.spyOn(graphManager, "getElementsInArea")
			.mockReturnValue(new Map([[42, "component"]]));
		controller.canvasPointerDown(pointer(1, 100, 100, true));
		controller.pointerMove(pointer(2, 800, 800));
		controller.pointerUp(pointer(2, 800, 800));
		expect(controller.gesture.kind).toBe("area");
		controller.pointerUp(pointer(1, 200, 250));
		expect(select).toHaveBeenCalledWith(
			{ x: 100, y: 100 },
			{ x: 200, y: 250 },
			editorViewModel.uiState.settings.areaSelectType,
		);
		expect(editorViewModel.isSelectedId(42)).toBe(true);
		expect(controller.gesture.kind).toBe("idle");
	});

	it("cancels area selection without changing selection", async () => {
		editorViewModel.setSelected({ id: 42, type: "component" });
		const select = vi.spyOn(graphManager, "getElementsInArea");
		controller.canvasPointerDown(pointer(1, 100, 100, true));
		await handleKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
		controller.pointerUp(pointer(1, 200, 250));
		expect(select).not.toHaveBeenCalled();
		expect(editorViewModel.isSelectedId(42)).toBe(true);
		expect(controller.gesture.kind).toBe("idle");
	});

	it("does not leave a long press armed after cancellation or a second touch", () => {
		vi.useFakeTimers();
		vi.stubGlobal("matchMedia", () => ({ matches: false }));
		controller.canvasPointerDown(pointer());
		controller.cancel();
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.gesture.kind).toBe("idle");
		controller.canvasPointerDown(pointer());
		controller.canvasPointerDown(pointer(2, 200, 100));
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.gesture.kind).toBe("pan");
	});

	it("starts area selection on long press", () => {
		vi.useFakeTimers();
		vi.stubGlobal("matchMedia", () => ({ matches: false }));
		controller.canvasPointerDown(pointer());
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(controller.gesture.kind).toBe("area");
		controller.pointerCancel(pointer());
		expect(controller.gesture.kind).toBe("idle");
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

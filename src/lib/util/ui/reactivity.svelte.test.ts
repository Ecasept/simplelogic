import { afterEach, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import { GraphManager } from "../graph/graph.svelte";
import {
	CommandGroup,
	MoveComponentCommand,
	UpdateCustomDataCommand,
} from "../graph/commands";
import { EditorViewModel } from "../editor/editorViewModel.svelte";
import { composeEditorUiState } from "../editor/editorUiState";
import { CanvasViewModel } from "../interaction/canvasViewModel.svelte";
import { CircuitModalViewModel } from "../persistence/circuitModalViewModel.svelte";
import { AuthViewModel } from "./authViewModel.svelte";
import { snapshot } from "../shared/snapshot.svelte";

const cleanup: (() => void)[] = [];
afterEach(() => {
	cleanup.splice(0).forEach((dispose) => dispose());
});

function observe<T>(read: () => T) {
	const values: T[] = [];
	cleanup.push(
		$effect.root(() => {
			$effect(() => {
				values.push(read());
			});
		}),
	);
	flushSync();
	return values;
}

function graphFixture() {
	const graph = new GraphManager();
	graph.setGraphData({
		components: Object.fromEntries(
			[0, 1].map((id) => [
				id,
				{
					id,
					type: "TEXT" as const,
					position: { x: 0, y: 0 },
					size: { x: 1, y: 1 },
					rotation: 0,
					isPoweredInitially: false,
					handles: {},
					customData: { text: "original" },
				},
			]),
		),
		wires: {},
		nextId: 2,
	});
	return graph;
}

it("updates only the graph fields that an observer reads and preserves entity identity", () => {
	const graph = graphFixture();
	const component = graph.graphData.components[0];
	const x = observe(() => graph.graphData.components[0].position.x);
	const otherText = observe(
		() => graph.graphData.components[1].customData?.text,
	);
	const empty = observe(() => graph.historyEmpty);
	const edit = graph.beginEdit();
	edit.preview(new MoveComponentCommand({ x: 10, y: 20 }, 0));
	flushSync();
	expect(x).toEqual([0, 10]);
	expect(otherText).toEqual(["original"]);
	expect(graph.getComponentData(0)).toBe(component);
	expect(empty).toEqual([true]);
	edit.commit();
	flushSync();
	expect(empty).toEqual([true, false]);
	graph.undoLastCommand();
	flushSync();
	expect(x).toEqual([0, 10, 0]);
	expect(empty).toEqual([true, false, true]);
});

it("restores a preview after a replacement group fails, then cancels cleanly", () => {
	const graph = graphFixture();
	const edit = graph.beginEdit();
	edit.preview(new MoveComponentCommand({ x: 10, y: 0 }, 0));
	const x = observe(() => graph.graphData.components[0].position.x);
	expect(() =>
		edit.replacePreview(
			new CommandGroup([
				new MoveComponentCommand({ x: 20, y: 0 }, 0),
				new UpdateCustomDataCommand(999, "text", "missing"),
			]),
		),
	).toThrow("does not exist");
	flushSync();
	expect(graph.graphData.components[0].position.x).toBe(10);
	expect(x.every((value) => value === 10)).toBe(true);
	edit.cancel();
	flushSync();
	expect(x.at(-1)).toBe(0);
	expect(graph.historyEmpty).toBe(true);
});

it("keeps snapshots independent and observers follow document replacement", () => {
	const graph = graphFixture();
	const origin = snapshot(graph.getGraphData());
	const text = observe(() => graph.graphData.components[0]?.customData?.text);
	graph.graphData.components[0].customData!.text = "changed";
	flushSync();
	expect(origin.components[0].customData?.text).toBe("original");
	expect(() => structuredClone(origin)).not.toThrow();
	graph.clear();
	flushSync();
	graph.setGraphData(origin);
	flushSync();
	expect(text).toEqual(["original", "changed", undefined, "original"]);
});

it("reacts to selection membership without invalidating unrelated editor fields", () => {
	const editor = new EditorViewModel();
	const ui = composeEditorUiState(editor.uiState, { kind: "idle" });
	const selected = observe(() => ui.selected.has(1));
	const mode = observe(() => ui.mode);
	editor.addSelected({ id: 1, type: "component" });
	flushSync();
	editor.setHoveredElement(2);
	flushSync();
	editor.removeSelectedId(1);
	flushSync();
	expect(selected).toEqual([false, true, false]);
	expect(mode).toEqual(["edit"]);
	editor.addSelected({ id: 1, type: "component" });
	flushSync();
	editor.hardReset();
	flushSync();
	expect(selected.slice(-2)).toEqual([true, false]);
});

it("updates canvas, authentication, and modal consumers without store subscriptions", () => {
	const canvas = new CanvasViewModel();
	const auth = new AuthViewModel();
	const modal = new CircuitModalViewModel();
	const editor = new EditorViewModel();
	editor.bindModal(modal);
	const width = observe(() => canvas.uiState.viewBox.width);
	const open = observe(() => auth.uiState.open);
	const blocked = observe(() => editor.isBlocked);
	vi.spyOn(canvas, "clientToSVGCoords").mockReturnValue({
		x: 0,
		y: 0,
	} as DOMPoint);
	canvas.zoom(0.5, { x: 0, y: 0 });
	auth.toggleOpen();
	modal.openSave();
	flushSync();
	modal.close();
	flushSync();
	expect(width).toEqual([1000, 500]);
	expect(open).toEqual([false, true]);
	expect(blocked).toEqual([false, true, false]);
});

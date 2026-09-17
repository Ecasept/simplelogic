import type { EditorUiState } from "./editorUiState";
import { isMatching, P } from "ts-pattern";
import type { Pattern } from "ts-pattern/types";
import {
	interactionController,
	clipboardActions,
	graphActions,
	editorViewModel,
	graphManager,
	modeActions,
	persistenceActions,
	editorUiState,
} from "./editor.svelte";
import { mousePosition } from "../shared/global.svelte";
import type { ComponentType } from "../shared/types";
import type { ElementType } from "./editorViewModel.svelte";

type Environment = { env: "editor" | "modal" };
type Key = { key: string; mod: string | null };
type State = EditorUiState & Environment & Key;
type ShortcutPattern = Pattern<State>;

type Shortcut<TPattern extends ShortcutPattern> = {
	name: string;
	pattern: TPattern;
	action: (state: P.narrow<State, TPattern>) => Promise<void> | void;
};

/** A helper function to create a shortcut without needing to specify any extra types */
function s<TPattern extends ShortcutPattern>(
	shortcut: Shortcut<TPattern>,
): Shortcut<TPattern> {
	return shortcut;
}

function isOnlyComponentsSelected(
	state: { selected: Map<number, ElementType> },
	t: ComponentType,
) {
	if (state.selected.size === 0) {
		return false;
	}

	const graphData = graphManager.getGraphData();
	return [...state.selected.entries()].every(
		([id, type]) =>
			type === "component" && graphData.components[id]?.type === t,
	);
}

const shortcuts = [
	s({
		name: "Cancel editing",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: P.union(
				"elementDown",
				"wireHandleDown",
				"addingComponent",
				"addingElements",
				"draggingElements",
				"addingWire",
				"draggingWireHandle",
			),
			isCanvasGesture: false,
		},
		action: interactionController.cancel,
	}),
	s({
		name: "Clear selection",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
			selected: P.when((s) => s.size > 0),
		},
		action: () => editorViewModel.clearSelection(),
	}),
	s({
		name: "Exit delete mode",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "delete",
			isCanvasGesture: false,
		},
		action: modeActions.toggleDelete,
	}),
	s({
		name: "Exit simulation mode",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "simulate",
			isCanvasGesture: false,
		},
		action: modeActions.toggleSimulate,
	}),
	s({
		name: "Close modal",
		pattern: {
			key: "escape",
			mod: null,
			env: "modal",
		},
		action: persistenceActions.closeModal,
	}),
	s({
		name: "Cancel panning",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			isCanvasGesture: true,
		},
		action: () => interactionController.cancel(),
	}),
	s({
		name: "Add AND gate",
		pattern: {
			key: "a",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent(
				"AND",
				mousePosition,
				"keyboard",
				null,
			);
		},
	}),
	s({
		name: "Add input",
		pattern: {
			key: "i",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent("IN", mousePosition, "keyboard", null);
		},
	}),
	s({
		name: "Add LED",
		pattern: {
			key: "l",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent(
				"LED",
				mousePosition,
				"keyboard",
				null,
			);
		},
	}),
	s({
		name: "Add NOT gate",
		pattern: {
			key: "n",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent(
				"NOT",
				mousePosition,
				"keyboard",
				null,
			);
		},
	}),
	s({
		name: "Add XOR gate",
		pattern: {
			key: "x",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent(
				"XOR",
				mousePosition,
				"keyboard",
				null,
			);
		},
	}),
	s({
		name: "Add OR gate",
		pattern: {
			key: "o",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent("OR", mousePosition, "keyboard", null);
		},
	}),
	s({
		name: "Add text box",
		pattern: {
			key: "t",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			interactionController.addComponent(
				"TEXT",
				mousePosition,
				"keyboard",
				null,
			);
		},
	}),
	s({
		name: "Toggle delete mode",
		pattern: {
			key: "d",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isCanvasGesture: false,
		},
		action: modeActions.toggleDelete,
	}),
	s({
		name: "Toggle simulation mode",
		pattern: {
			key: "s",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isCanvasGesture: false,
		},
		action: modeActions.toggleSimulate,
	}),
	s({
		name: "Save circuit",
		pattern: {
			key: "s",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isCanvasGesture: false,
		},
		action: persistenceActions.saveGraph,
	}),
	s({
		name: "Load circuit",
		pattern: {
			key: "l",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isCanvasGesture: false,
		},
		action: persistenceActions.loadGraphManually,
	}),
	s({
		name: "Undo edit",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: graphActions.undo,
	}),
	s({
		name: "Undo deletion",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "delete",
			isCanvasGesture: false,
		},
		action: graphActions.undo,
	}),
	s({
		name: "Delete selected",
		pattern: {
			key: "delete",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((s) => s.size > 0),
		},
		action: () => {
			graphActions.deleteSelected();
		},
	}),
	s({
		name: "Invert selected inputs",
		pattern: {
			key: P.when((key) => key === " " || key === "spacebar"),
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((selected) =>
				isOnlyComponentsSelected({ selected }, "IN"),
			),
			isCanvasGesture: false,
		},
		action: (uiState) => {
			for (const inputId of uiState.selected.keys()) {
				graphActions.togglePower(inputId);
			}
		},
	}),
	s({
		name: "Rotate selected clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((s) => s.size === 1),
		},
		action: (uiState) => {
			const [selectedId] = uiState.selected.keys();
			graphActions.rotateComponent(selectedId, 90);
		},
	}),
	s({
		name: "Rotate selected counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((s) => s.size === 1),
		},
		action: (uiState) => {
			const [selectedId] = uiState.selected.keys();
			graphActions.rotateComponent(selectedId, -90);
		},
	}),
	s({
		name: "Cancel editing when undoing while editing",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			kind: P.union(
				"addingComponent",
				"addingElements",
				"draggingElements",
				"addingWire",
				"draggingWireHandle",
			),
			isCanvasGesture: false,
		},
		action: interactionController.cancel,
	}),
	s({
		name: "Clear canvas",
		pattern: {
			key: "c",
			mod: "shift",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isCanvasGesture: false,
		},
		action: graphActions.clearCanvas,
	}),
	s({
		name: "Rotate dragged/adding clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			kind: P.union("draggingElements", "addingComponent"),
			isCanvasGesture: false,
		},
		action: (uiState) => {
			graphActions.rotateComponent(uiState.clickedElement.id, 90, false);
		},
	}),
	s({
		name: "Rotate dragged/adding counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			kind: P.union("draggingElements", "addingComponent"),
			isCanvasGesture: false,
		},
		action: (uiState) => {
			graphActions.rotateComponent(uiState.clickedElement.id, -90, false);
		},
	}),
	s({
		name: "Duplicate selected",
		pattern: {
			key: "d",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((s) => s.size > 0),
			isCanvasGesture: false,
		},
		action: () => {
			clipboardActions.duplicateSelectedAndDrag();
		},
	}),
	s({
		name: "Copy selected",
		pattern: {
			key: "c",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			kind: "idle",
			selected: P.when((s) => s.size > 0),
			isCanvasGesture: false,
		},
		action: () => {
			clipboardActions.copySelected();
		},
	}),
	s({
		name: "Paste clipboard",
		pattern: {
			key: "v",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			kind: "idle",
			isCanvasGesture: false,
		},
		action: () => {
			clipboardActions.pasteClipboard();
		},
	}),
];

function getPressedMod(e: KeyboardEvent) {
	return e.ctrlKey || e.metaKey
		? "ctrl" // Ctrl/Cmd
		: e.altKey
			? "alt"
			: e.shiftKey
				? "shift"
				: null;
}

function constructValue(e: KeyboardEvent): State {
	return {
		...editorUiState.current,
		key: e.key.toLowerCase(),
		mod: getPressedMod(e),
		env: editorUiState.current.isModalOpen ? "modal" : "editor",
	};
}

export async function handleKeyDown(e: KeyboardEvent) {
	if (
		e.target instanceof HTMLInputElement ||
		e.target instanceof HTMLTextAreaElement
	) {
		return;
	}

	const value = constructValue(e);

	let preventedDefault = false;

	for (const shortcut of shortcuts) {
		if (isMatching(shortcut.pattern, value)) {
			if (!preventedDefault) {
				e.preventDefault();
				preventedDefault = true;
			}

			// Apparently typescript can't handle large unions well
			// like the shortcut array
			// @ts-ignore
			await shortcut.action(value);
		}
	}
}

/** Can be wrapped around a function to only call it when the Enter key is pressed
 *
 * @example
 * ```html
 * <input onkeydown={onEnter((e) => console.log("Enter pressed"))} />
 * ```
 */
export function onEnter(func: (e: KeyboardEvent) => void) {
	return (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			func(e);
		}
	};
}

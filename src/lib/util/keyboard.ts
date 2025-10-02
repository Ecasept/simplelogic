import { isMatching, P } from "ts-pattern";
import type { Pattern } from "ts-pattern/types";
import {
	AddAction,
	ChangesAction,
	DeleteAction,
	DuplicateAction,
	EditorAction,
	editorViewModel,
	ModeAction,
	PersistenceAction,
} from "./actions.svelte";
import { mousePosition } from "./global.svelte";
import type { EditorUiState } from "./viewModels/editorViewModel.svelte";

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

const shortcuts = [
	s({
		name: "Cancel editing",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: P.union(
				"addingComponent",
				"draggingElements",
				"addingWire",
				"draggingWireHandle",
			),
			isPanning: false,
		},
		action: ChangesAction.abortEditing,
	}),
	s({
		name: "Clear selection",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
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
			isPanning: false,
		},
		action: ModeAction.toggleDelete,
	}),
	s({
		name: "Exit simulation mode",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "simulate",
			isPanning: false,
		},
		action: ModeAction.toggleSimulate,
	}),
	s({
		name: "Close modal",
		pattern: {
			key: "escape",
			mod: null,
			env: "modal",
		},
		action: PersistenceAction.closeModal,
	}),
	s({
		name: "Cancel panning",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			isPanning: true,
		},
		action: EditorAction.abortPanning,
	}),
	s({
		name: "Add AND gate",
		pattern: {
			key: "a",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("AND", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add input",
		pattern: {
			key: "i",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("IN", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add LED",
		pattern: {
			key: "l",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("LED", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add NOT gate",
		pattern: {
			key: "n",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("NOT", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add XOR gate",
		pattern: {
			key: "x",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("XOR", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add OR gate",
		pattern: {
			key: "o",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("OR", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Add text box",
		pattern: {
			key: "t",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: () => {
			AddAction.addComponent("TEXT", mousePosition, "keyboard");
		},
	}),
	s({
		name: "Toggle delete mode",
		pattern: {
			key: "d",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: ModeAction.toggleDelete,
	}),
	s({
		name: "Toggle simulation mode",
		pattern: {
			key: "s",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: ModeAction.toggleSimulate,
	}),
	s({
		name: "Save circuit",
		pattern: {
			key: "s",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: PersistenceAction.saveGraph,
	}),
	s({
		name: "Load circuit",
		pattern: {
			key: "l",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: PersistenceAction.loadGraphManually,
	}),
	s({
		name: "Undo edit",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			editType: "idle",
			isPanning: false,
		},
		action: EditorAction.undo,
	}),
	s({
		name: "Undo deletion",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "delete",
			isPanning: false,
		},
		action: EditorAction.undo,
	}),
	s({
		name: "Delete selected",
		pattern: {
			key: "delete",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.when((s) => s.size > 0),
		},
		action: () => {
			DeleteAction.deleteSelected();
		},
	}),
	s({
		name: "Rotate selected clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.when((s) => s.size === 1),
		},
		action: (uiState) => {
			const [selectedId] = uiState.selected.keys();
			EditorAction.rotateComponent(selectedId, 90);
		},
	}),
	s({
		name: "Rotate selected counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.when((s) => s.size === 1),
		},
		action: (uiState) => {
			const [selectedId] = uiState.selected.keys();
			EditorAction.rotateComponent(selectedId, -90);
		},
	}),
	s({
		name: "Cancel editing when undoing while editing",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			editType: P.union(
				"addingComponent",
				"draggingElements",
				"addingWire",
				"draggingWireHandle",
			),
			isPanning: false,
		},
		action: ChangesAction.abortEditing,
	}),
	s({
		name: "Clear canvas",
		pattern: {
			key: "c",
			mod: "shift",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: EditorAction.clearCanvas,
	}),
	s({
		name: "Rotate dragged/adding clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: P.union("draggingElements", "addingComponent"),
			isPanning: false,
		},
		action: (uiState) => {
			EditorAction.rotateComponent(uiState.clickedElement.id, 90, false);
		},
	}),
	s({
		name: "Rotate dragged/adding counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			editType: P.union("draggingElements", "addingComponent"),
			isPanning: false,
		},
		action: (uiState) => {
			EditorAction.rotateComponent(uiState.clickedElement.id, -90, false);
		},
	}),
	s({
		name: "Duplicate selected",
		pattern: {
			key: "d",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.when((s) => s.size > 0),
			isPanning: false,
		},
		action: () => {
			DuplicateAction.duplicateSelected();
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
		...editorViewModel.uiState,
		key: e.key.toLowerCase(),
		mod: getPressedMod(e),
		env: editorViewModel.uiState.isModalOpen ? "modal" : "editor",
	};
}

export async function handleKeyDown(e: KeyboardEvent) {
	if (e.target instanceof HTMLInputElement) {
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

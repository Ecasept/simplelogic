import { match, P } from "ts-pattern";
import type { Pattern } from "ts-pattern/types";
import {
	ChangesAction,
	EditorAction,
	editorViewModel,
	ModeAction,
	PersistenceAction,
} from "./actions";
import { mousePosition } from "./global.svelte";
import type { EditorUiState } from "./viewModels/editorViewModel.svelte";

type Environment = { env: "editor" | "modal" };
type Key = { key: string; mod: string | null };

type Shortcut = {
	name: string;
	pattern: Pattern<EditorUiState & Environment & Key>;
	action: () => Promise<void> | void;
};

const shortcuts: Shortcut[] = [
	{
		name: "Cancel editing",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: P.union(
				"addingComponent",
				"addingWire",
				"draggingComponent",
				"draggingWire",
			),
			isPanning: false,
		},
		action: ChangesAction.abortEditing,
	},
	{
		name: "Exit delete mode",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "delete",
			isPanning: false,
		},
		action: ModeAction.toggleDelete,
	},
	{
		name: "Exit simulation mode",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			mode: "simulate",
			isPanning: false,
		},
		action: ModeAction.toggleSimulate,
	},
	{
		name: "Close modal",
		pattern: {
			key: "escape",
			mod: null,
			env: "modal",
		},
		action: PersistenceAction.closeModal,
	},
	{
		name: "Cancel panning",
		pattern: {
			key: "escape",
			mod: null,
			env: "editor",
			isPanning: true,
		},
		action: EditorAction.abortPanning,
	},
	{
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
			EditorAction.addComponent("AND", mousePosition, "keyboard");
		},
	},
	{
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
			EditorAction.addComponent("IN", mousePosition, "keyboard");
		},
	},
	{
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
			EditorAction.addComponent("LED", mousePosition, "keyboard");
		},
	},
	{
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
			EditorAction.addComponent("NOT", mousePosition, "keyboard");
		},
	},
	{
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
			EditorAction.addComponent("XOR", mousePosition, "keyboard");
		},
	},
	{
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
			EditorAction.addComponent("OR", mousePosition, "keyboard");
		},
	},
	{
		name: "Toggle delete mode",
		pattern: {
			key: "d",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: ModeAction.toggleDelete,
	},
	{
		name: "Toggle simulation mode",
		pattern: {
			key: "s",
			mod: null,
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: ModeAction.toggleSimulate,
	},
	{
		name: "Save circuit",
		pattern: {
			key: "s",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: PersistenceAction.saveGraph,
	},
	{
		name: "Load circuit",
		pattern: {
			key: "l",
			mod: "ctrl",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: PersistenceAction.loadGraph,
	},
	{
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
	},
	{
		name: "Undo deletion",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "delete",
			isPanning: false,
		},
		action: EditorAction.undo,
	},
	{
		name: "Delete selected",
		pattern: {
			key: "delete",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.not(null),
		},
		action: EditorAction.deleteSelected,
	},
	{
		name: "Rotate selected clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.not(null),
		},
		action: () => {
			const uiState = editorViewModel.uiState;
			if ("selected" in uiState && uiState.selected !== null) {
				EditorAction.rotateComponent(uiState.selected, 90);
			}
		},
	},
	{
		name: "Rotate selected counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			editType: "idle",
			selected: P.not(null),
		},
		action: () => {
			const uiState = editorViewModel.uiState;
			if ("selected" in uiState && uiState.selected !== null) {
				EditorAction.rotateComponent(uiState.selected, -90);
			}
		},
	},
	{
		name: "Cancel editing when undoing while editing",
		pattern: {
			key: "z",
			mod: "ctrl",
			env: "editor",
			mode: "edit",
			editType: P.union(
				"addingComponent",
				"addingWire",
				"draggingComponent",
				"draggingWire",
			),
			isPanning: false,
		},
		action: ChangesAction.abortEditing,
	},
	{
		name: "Clear canvas",
		pattern: {
			key: "c",
			mod: "shift",
			env: "editor",
			mode: P.union("edit", "simulate", "delete"),
			isPanning: false,
		},
		action: EditorAction.clearCanvas,
	},
	{
		name: "Rotate dragged clockwise",
		pattern: {
			key: "r",
			mod: null,
			env: "editor",
			mode: "edit",
			editType: P.union("draggingComponent", "addingComponent"),
			isPanning: false,
		},
		action: () => {
			EditorAction.rotateDraggedComponent(90);
		},
	},
	{
		name: "Rotate dragged counter-clockwise",
		pattern: {
			key: "r",
			mod: "shift",
			env: "editor",
			mode: "edit",
			editType: P.union("draggingComponent", "addingComponent"),
			isPanning: false,
		},
		action: () => {
			EditorAction.rotateDraggedComponent(-90);
		},
	},
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

function constructValue(e: KeyboardEvent) {
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

	const matchingShortcuts = shortcuts.filter((shortcut) =>
		match(value)
			.with(shortcut.pattern, () => true)
			.otherwise(() => false),
	);

	if (matchingShortcuts.length > 0) {
		e.preventDefault();
		for (const shortcut of matchingShortcuts) {
			await shortcut.action();
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

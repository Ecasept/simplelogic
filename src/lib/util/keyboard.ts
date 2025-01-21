import {
	ChangesAction,
	EditorAction,
	editorViewModel,
	PersistenceAction,
} from "./actions";
import { mousePosition } from "./global";

type Shortcut = {
	key: string;
	mod: string | null;
	env: string;
	mode: (string | null)[];
	action: () => void;
};

const shortcuts: Shortcut[] = [
	{
		key: "escape",
		mod: null,
		env: "editor",
		mode: ["add", "move"],
		action: ChangesAction.abortEditing,
	},
	{
		key: "escape",
		mod: null,
		env: "editor",
		mode: ["delete"],
		action: EditorAction.toggleDelete,
	},
	{
		key: "escape",
		mod: null,
		env: "editor",
		mode: ["simulate"],
		action: EditorAction.toggleSimulate,
	},
	{
		key: "escape",
		mod: null,
		env: "modal",
		mode: [null],
		action: PersistenceAction.closeModal,
	},
	{
		key: "a",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("AND", mousePosition);
		},
	},
	{
		key: "i",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("IN", mousePosition);
		},
	},
	{
		key: "l",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("LED", mousePosition);
		},
	},
	{
		key: "n",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("NOT", mousePosition);
		},
	},
	{
		key: "x",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("XOR", mousePosition);
		},
	},
	{
		key: "o",
		mod: null,
		env: "editor",
		mode: [null, "delete", "add", "move"],
		action: () => {
			EditorAction.addComponent("OR", mousePosition);
		},
	},
	{
		key: "d",
		mod: null,
		env: "editor",
		mode: [null, "delete", "simulate"],
		action: EditorAction.toggleDelete,
	},
	{
		key: "s",
		mod: null,
		env: "editor",
		mode: [null, "delete", "simulate"],
		action: EditorAction.toggleSimulate,
	},
	{
		key: "s",
		mod: "ctrl",
		env: "editor",
		mode: [null, "delete", "simulate"],
		action: PersistenceAction.saveGraph,
	},
	{
		key: "l",
		mod: "ctrl",
		env: "editor",
		mode: [null, "delete", "simulate"],
		action: PersistenceAction.loadGraph,
	},
	{
		key: "z",
		mod: "ctrl",
		env: "editor",
		mode: [null, "delete"],
		action: EditorAction.undo,
	},
	{
		key: "c",
		mod: "shift",
		env: "editor",
		mode: [null, "delete", "simulate", "add", "move"],
		action: EditorAction.clear,
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

function getMatches(
	shortcut: Shortcut,
	env: string,
	mode: string | null,
	e: KeyboardEvent,
) {
	const pressedKey = e.key;
	const pressedMod = getPressedMod(e);

	return (
		shortcut.key === pressedKey.toLowerCase() &&
		shortcut.mod === pressedMod &&
		shortcut.env === env &&
		shortcut.mode.includes(mode)
	);
}

export function handleKeyDown(e: KeyboardEvent) {
	// x == null checks for undefined or null
	if (e.target !== null && (e.target as HTMLElement).nodeName != null) {
		if ((e.target as HTMLElement).nodeName.toLowerCase() === "input") {
			return;
		}
	}
	let env = null;
	if (editorViewModel.uiState.isModalOpen) {
		env = "modal";
	} else {
		env = "editor";
	}

	const mode = env == "editor" ? editorViewModel.uiState.editMode : null;

	const matchingShortcuts = shortcuts.filter((shortcut) =>
		getMatches(shortcut, env, mode, e),
	);

	if (matchingShortcuts.length > 0) {
		e.preventDefault();
		for (const shortcut of matchingShortcuts) {
			shortcut.action();
		}
	}
}

export function onEnter(f: (e: KeyboardEvent) => void) {
	return (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			f(e);
		}
	};
}

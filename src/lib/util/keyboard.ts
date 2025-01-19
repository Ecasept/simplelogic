import {
	ChangesAction,
	EditorAction,
	editorViewModel,
	PersistenceAction,
} from "./actions";
import { mousePosition } from "./global";

const shortcuts = [
	{
		key: "escape",
		mod: null,
		env: "editor",
		action: ChangesAction.discardChanges,
	},
	{
		key: "escape",
		mod: null,
		env: "modal",
		action: PersistenceAction.closeModal,
	},
	{
		key: "a",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("AND", mousePosition);
		},
	},
	{
		key: "i",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("IN", mousePosition);
		},
	},
	{
		key: "l",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("LED", mousePosition);
		},
	},
	{
		key: "n",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("NOT", mousePosition);
		},
	},
	{
		key: "x",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("XOR", mousePosition);
		},
	},
	{
		key: "d",
		mod: null,
		env: "editor",
		action: EditorAction.toggleDelete,
	},
	{
		key: "s",
		mod: null,
		env: "editor",
		action: EditorAction.toggleSimulate,
	},
	{
		key: "o",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("OR", mousePosition);
		},
	},
	{
		key: "s",
		mod: "ctrl",
		env: "editor",
		action: PersistenceAction.saveGraph,
	},
	{
		key: "l",
		mod: "ctrl",
		env: "editor",
		action: PersistenceAction.loadGraph,
	},
	{
		key: "z",
		mod: "ctrl",
		env: "editor",
		action: EditorAction.undo,
	},
];

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
	const pressedKey = e.key;
	const pressedMod =
		e.ctrlKey || e.metaKey
			? "ctrl" // Ctrl/Cmd
			: e.altKey
				? "alt"
				: e.shiftKey
					? "shift"
					: null;

	const matchingShortcut = shortcuts.find(
		(shortcut) =>
			shortcut.key === pressedKey.toLowerCase() &&
			shortcut.mod === pressedMod &&
			shortcut.env === env,
	);

	if (matchingShortcut) {
		e.preventDefault();
		matchingShortcut.action();
	}
}

export function onEnter(f: (e: KeyboardEvent) => void) {
	return (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			f(e);
		}
	};
}

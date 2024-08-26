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
			EditorAction.addComponent("test", "AND", mousePosition);
		},
	},
	{
		key: "o",
		mod: null,
		env: "editor",
		action: () => {
			EditorAction.addComponent("test", "OR", mousePosition);
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

export function handleKey(e: KeyboardEvent) {
	console.log(e);
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

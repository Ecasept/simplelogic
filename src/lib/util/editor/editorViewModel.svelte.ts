import type { HandleReference } from "../shared/types";
/** References an element, and including its type.
 * This is useful because, even though an element can be
 * uniquely identified by its ID, many operations behave differently
 * depending on whether the element is a component or a wire, so
 * by storing the type, we can avoid having to look it up many times later.
 */
export type TypedReference = {
	id: number;
	/** The type of the selected element, either "component" or "wire" */
	type: "component" | "wire";
};
export type ElementType = "component" | "wire";

/** Base properties that are always present */
export type BaseState = {
	hoveredHandle: HandleReference | null;
	hoveredElement: number | null;
	isModalOpen: boolean;
};

export type AreaSelectType = "intersect" | "contain";

export type SettingsState = {
	/** The settings of the editor */
	settings: {
		/** Whether dragging elements should snap to the grid */
		gridSnap: boolean;
		/** Whether area selection should select elements that intersect the selection area, or only those fully contained within it */
		areaSelectType: AreaSelectType;
		/** Whether when selecting a component to place with the keyboard shortcut, you can place multiple of them in a row without having to re-select it each time */
		continuousPlacement: boolean;
	};
};

export type EditorMode = "edit" | "delete" | "simulate";
export type EditorState = BaseState &
	SettingsState & {
		mode: EditorMode;
		selected: Map<number, ElementType>;
	};

/** Persistent editor state. Active interactions belong exclusively to the controller. */
export class EditorViewModel {
	private initialUiState: EditorState = {
		mode: "edit",
		selected: new Map(),
		hoveredHandle: null,
		hoveredElement: null,
		isModalOpen: false,
		settings: {
			gridSnap: true,
			areaSelectType: "intersect",
			continuousPlacement: false,
		},
	};
	private _uiState = structuredClone(this.initialUiState);
	private published = $state.raw<EditorState>(structuredClone(this._uiState));
	get uiState(): Readonly<EditorState> {
		return this.published;
	}
	private notifyAll() {
		this.published = structuredClone(this._uiState);
	}

	hardReset() {
		this._uiState = structuredClone(this.initialUiState);
		this.notifyAll();
	}
	setMode(mode: EditorMode) {
		if (this._uiState.mode === mode) {
			return;
		}
		this._uiState.mode = mode;
		this._uiState.selected = new Map();
		this.notifyAll();
	}
	// ==== Persistent state setters ====
	setModalOpen(val: boolean) {
		this._uiState.isModalOpen = val;
		this.notifyAll();
	}

	setHoveredElement(id: number) {
		this._uiState.hoveredElement = id;
		this.notifyAll();
	}

	removeHoveredElement() {
		this._uiState.hoveredElement = null;
		this.notifyAll();
	}
	setHoveredHandle(handle: HandleReference) {
		if (this._uiState.hoveredHandle !== null) {
			console.warn("hovered handle already set");
		}
		this._uiState.hoveredHandle = handle;
		this.notifyAll();
	}
	removeHoveredHandle() {
		this._uiState.hoveredHandle = null;
		this.notifyAll();
	}
	/** Add `element` to the selection */
	addSelected(element: TypedReference) {
		if (this._uiState.mode !== "edit") {
			console.warn("Tried to select an element in an invalid mode");
			return;
		}
		this._uiState.selected.set(element.id, element.type);
		this.notifyAll();
	}
	/** Remove `element` from the selection */
	removeSelected(element: TypedReference) {
		this.removeSelectedId(element.id);
	}
	/** Remove the element with the given `id` from the selection */
	removeSelectedId(id: number) {
		if (this._uiState.mode !== "edit") {
			console.warn("Tried to deselect an element in an invalid mode");
			return;
		}
		this._uiState.selected.delete(id);
		this.notifyAll();
	}
	/** Set the selection to only contain the given element */
	setSelected(element: TypedReference) {
		if (this._uiState.mode !== "edit") {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this._uiState.selected = new Map<number, ElementType>();
		this._uiState.selected.set(element.id, element.type);
		this.notifyAll();
	}
	/** Set the selection to only contain the given elements */
	setSelectedElements(elements: Map<number, ElementType>) {
		if (this._uiState.mode !== "edit") {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this._uiState.selected = new Map(elements);
		this.notifyAll();
	}
	clearSelection() {
		if (this._uiState.mode !== "edit") {
			console.warn("Tried to clear selection in an invalid mode");
			return;
		}
		this._uiState.selected.clear();
		this.notifyAll();
	}
	isSelected(element: TypedReference) {
		return this.isSelectedId(element.id);
	}
	isSelectedId(id: number) {
		// Use the public version of the state to ensure reactivity
		return this.uiState.selected.has(id);
	}
	getSelectedCount() {
		return this.uiState.selected.size;
	}
	setGridSnap(val: boolean) {
		this._uiState.settings.gridSnap = val;
		this.updateSettings();
	}
	setAreaSelectType(val: AreaSelectType) {
		this._uiState.settings.areaSelectType = val;
		this.updateSettings();
	}
	setContinuousPlacement(val: boolean) {
		this._uiState.settings.continuousPlacement = val;
		this.updateSettings();
	}
	updateSettings() {
		localStorage.setItem(
			"editorSettings",
			JSON.stringify(this._uiState.settings),
		);
		this.notifyAll();
	}
	applySettings(settings: Partial<SettingsState["settings"]>) {
		this._uiState.settings = { ...this._uiState.settings, ...settings };
		this.notifyAll();
	}
}

export const editorViewModel = new EditorViewModel();

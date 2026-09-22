import { SvelteMap } from "svelte/reactivity";
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
	// Is there an ongoing action blocking input
	isProcessBlocked: boolean;
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
	private createInitialState(): Omit<EditorState, "isModalOpen"> {
		return {
			mode: "edit",
			selected: new SvelteMap(),
			hoveredHandle: null,
			hoveredElement: null,
			isProcessBlocked: false,
			settings: {
				gridSnap: true,
				areaSelectType: "intersect",
				continuousPlacement: false,
			},
		};
	}
	private state = $state(this.createInitialState());
	private modal = $state.raw<{
		readonly uiState: { mode: "closed" | "load" | "save" };
	} | null>(null);
	bindModal(source: {
		readonly uiState: { mode: "closed" | "load" | "save" };
	}) {
		this.modal = source;
	}
	// Getters preserve field-level dependencies instead of spreading the entire state.
	readonly uiState: Readonly<EditorState> = (() => {
		const owner = this;
		return {
			get mode() {
				return owner.state.mode;
			},
			get selected() {
				return owner.state.selected;
			},
			get hoveredHandle() {
				return owner.state.hoveredHandle;
			},
			get hoveredElement() {
				return owner.state.hoveredElement;
			},
			get isProcessBlocked() {
				return owner.state.isProcessBlocked;
			},
			get settings() {
				return owner.state.settings;
			},
			get isModalOpen() {
				return owner.modal !== null && owner.modal.uiState.mode !== "closed";
			},
		};
	})();

	hardReset() {
		this.state = this.createInitialState();
	}
	resetDocumentState() {
		this.state.mode = "edit";
		this.state.selected = new SvelteMap();
		this.state.hoveredHandle = null;
		this.state.hoveredElement = null;
	}
	private blockingCount = 0;
	get isBlocked() {
		return this.uiState.isModalOpen || this.uiState.isProcessBlocked;
	}
	/** Keep input blocked until every overlapping operation has settled. */
	async blocking<T>(fn: () => Promise<T> | T): Promise<T> {
		this.blockingCount++;
		this.state.isProcessBlocked = true;
		try {
			return await fn();
		} finally {
			this.blockingCount--;
			this.state.isProcessBlocked = this.blockingCount > 0;
		}
	}
	setMode(mode: EditorMode) {
		if (this.state.mode === mode) {
			return;
		}
		this.state.mode = mode;
		this.state.selected = new SvelteMap();
	}
	// ==== Persistent state setters ====

	setHoveredElement(id: number) {
		this.state.hoveredElement = id;
	}

	removeHoveredElement() {
		this.state.hoveredElement = null;
	}
	setHoveredHandle(handle: HandleReference) {
		if (this.state.hoveredHandle !== null) {
			console.warn("hovered handle already set");
		}
		this.state.hoveredHandle = handle;
	}
	removeHoveredHandle() {
		this.state.hoveredHandle = null;
	}
	/** Add `element` to the selection */
	addSelected(element: TypedReference) {
		if (this.state.mode !== "edit") {
			console.warn("Tried to select an element in an invalid mode");
			return;
		}
		this.state.selected.set(element.id, element.type);
	}
	/** Remove `element` from the selection */
	removeSelected(element: TypedReference) {
		this.removeSelectedId(element.id);
	}
	/** Remove the element with the given `id` from the selection */
	removeSelectedId(id: number) {
		if (this.state.mode !== "edit") {
			console.warn("Tried to deselect an element in an invalid mode");
			return;
		}
		this.state.selected.delete(id);
	}
	/** Set the selection to only contain the given element */
	setSelected(element: TypedReference) {
		if (this.state.mode !== "edit") {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this.state.selected = new SvelteMap<number, ElementType>();
		this.state.selected.set(element.id, element.type);
	}
	/** Set the selection to only contain the given elements */
	setSelectedElements(elements: Map<number, ElementType>) {
		if (this.state.mode !== "edit") {
			console.warn("Tried to set selection in an invalid mode");
			return;
		}
		this.state.selected = new SvelteMap(elements);
	}
	clearSelection() {
		if (this.state.mode !== "edit") {
			console.warn("Tried to clear selection in an invalid mode");
			return;
		}
		this.state.selected.clear();
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
		this.state.settings.gridSnap = val;
		this.updateSettings();
	}
	setAreaSelectType(val: AreaSelectType) {
		this.state.settings.areaSelectType = val;
		this.updateSettings();
	}
	setContinuousPlacement(val: boolean) {
		this.state.settings.continuousPlacement = val;
		this.updateSettings();
	}
	updateSettings() {
		localStorage.setItem("editorSettings", JSON.stringify(this.state.settings));
	}
	applySettings(settings: Partial<SettingsState["settings"]>) {
		this.state.settings = { ...this.state.settings, ...settings };
	}
}

export const editorViewModel = new EditorViewModel();

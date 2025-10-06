import { graphManager } from "../actions.svelte";
import { API } from "../api";
import { calculateHandlePosition } from "../global.svelte";
import type { ComponentData, GraphData } from "../types";
import { ViewModel } from "./viewModel";

export type FeedbackMessage = {
	type: "error" | "success";
	message: string;
};

export type CircuitModalUiState =
	| {
		mode: null;
		callback: null;
		message: null;
		listRequestData: null;
		loadMode: null;
		fixConnections: null;
		isOnboarding: null,
	}
	| {
		mode: "load";
		message: FeedbackMessage | null;
		callback: (graphData: GraphData, type: "preset" | "custom") => void;
		listRequestData: ListRequestData | null;
		isLoadingList: boolean;
		loadMode: "select" | "list";
		fixConnections: boolean;
		isOnboarding: boolean,
	}
	| {
		mode: "save";
		message: FeedbackMessage | null;
		callback: () => void;
		listRequestData: null;
		isLoadingList: false;
		loadMode: null;
		fixConnections: null;
		isOnboarding: null,
	};

type ListRequestData = {
	circuits: {
		name: string;
		id: number;
		wireCount: number;
		componentCount: number;
		createdAt: string;
	}[];
	pagination: {
		page: number;
		perPage: number;
		hasNextPage: boolean;
	};
} | null;

export class CircuitModalViewModel extends ViewModel<CircuitModalUiState> {
	protected _uiState: CircuitModalUiState = {
		mode: null,
		message: null,
		callback: null,
		listRequestData: null,
		loadMode: null,
		fixConnections: null,
		isOnboarding: null,
	};

	protected resetUiState() {
		this._uiState = {
			mode: null,
			message: null,
			callback: null,
			listRequestData: null,
			loadMode: null,
			fixConnections: null,
			isOnboarding: null,
		};
	}

	setFixConnections(val: boolean) {
		if (this._uiState.mode !== "load") return;
		this._uiState.fixConnections = val;
		this.notifyAll();
	}

	private computeComponentHandlePos(comp: ComponentData, handleId: string) {
		const handle = comp.handles[handleId];
		return calculateHandlePosition(
			handle.edge,
			handle.pos,
			comp.size,
			comp.position,
			comp.rotation,
			true,
		);
	}

	private fixGraphConnections(graphData: GraphData): GraphData {
		// Creates a deep copy and normalizes every wire endpoint coordinate:
		// 1. Wire input -> the position of any connected output
		// 2. Wire output -> the position of a connected component input (if any)
		const data = structuredClone(graphData);
		for (const wireId in data.wires) {
			const wire = data.wires[wireId];

			// ---- INPUT END FIX ----
			const inputHandle = wire.handles.input;
			if (inputHandle.connections.length > 0) {
				const conn = inputHandle.connections[0]; // there should be only one connection
				if (conn.type === "wire") {
					// Snap to other wire handle coordinate
					const other = data.wires[conn.id];
					if (other) {
						inputHandle.x = other.handles[conn.handleId].x;
						inputHandle.y = other.handles[conn.handleId].y;
					}
				} else if (conn.type === "component") {
					// Snap to computed component handle position
					const comp = data.components[conn.id];
					if (comp) {
						const pos = this.computeComponentHandlePos(comp, conn.handleId);
						inputHandle.x = pos.x;
						inputHandle.y = pos.y;
					}
				}
			}

			// ---- OUTPUT END FIX ----
			const outputHandle = wire.handles.output;
			const compConn = outputHandle.connections.find(c => c.type === "component");
			if (compConn) {
				// If the wire drives a component input, snap its output endpoint there
				const comp = data.components[compConn.id];
				if (comp) {
					const pos = this.computeComponentHandlePos(comp, compConn.handleId);
					outputHandle.x = pos.x;
					outputHandle.y = pos.y;
				}
			}
		}
		return data;
	}

	async copyCircuitToClipboard() {
		if (this._uiState.mode !== "save") {
			throw new Error("Invalid mode");
		}
		const graphData = graphManager.getGraphData();
		const json = JSON.stringify(graphData);
		await navigator.clipboard.writeText(json);
		this.setSuccess("Circuit copied to clipboard");
		this._uiState.callback();
	}
	async pasteCircuitFromClipboard() {
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		const json = await navigator.clipboard.readText();
		try {
			let graphData = JSON.parse(json);
			const validationResult = graphManager.validateData(graphData);
			if (!validationResult.success) {
				this.setError("Invalid data: " + validationResult.error.message);
				return;
			}
			if (this._uiState.fixConnections) {
				graphData = this.fixGraphConnections(graphData);
			}
			this.setSuccess("Circuit pasted from clipboard");
			this._uiState.callback(graphData, "custom");
		} catch (e: unknown) {
			if (e instanceof Error) {
				console.warn(e);
				this.setError("Invalid data: " + e.message);
			} else {
				console.error(e);
				this.setError("Unknown error");
				throw e;
			}
		}
	}

	async saveCircuit(currentName: string) {
		if (this._uiState.mode !== "save") {
			throw new Error("Invalid mode");
		}
		const graphData = graphManager.getGraphData();
		const data = await API.saveCircuit(currentName, graphData);
		if (data.success) {
			this.setSuccess("Circuit saved successfully");
			this._uiState.callback();
		} else {
			this.setError(data.error);
		}
	}

	async loadCircuitList(page: number) {
		this._uiState.loadMode = "list";
		this.notifyAll();
		const data = await API.loadCircuitList(page);
		if (data.success) {
			this._uiState.listRequestData = data.data;
			this.closeFeedback();
		} else {
			this.setError(data.error);
		}
	}

	async loadCircuit(id: number) {
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		const data = await API.loadCircuit(id);
		if (data.success) {
			let graphData = data.data;
			if (this._uiState.fixConnections) {
				graphData = this.fixGraphConnections(graphData);
			}
			this.setSuccess("Circuit loaded successfully");
			this._uiState.callback(graphData, "custom");
		} else {
			this.setError(data.error);
		}
	}

	async deleteCircuit(id: number, goToPrevPage: boolean) {
		const correction = goToPrevPage ? -1 : 0;
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		const data = await API.deleteCircuit(id);
		if (data.success) {
			this.setSuccess("Circuit deleted successfully");
			const page = this._uiState.listRequestData?.pagination.page ?? 1;
			this.loadCircuitList(page + correction);
		} else {
			this.setError(data.error);
		}
	}

	open(
		mode: "save" | "load",
		callback: ((graphData: GraphData, type: "custom" | "preset") => void) | null,
		{ isOnboarding = true }: { isOnboarding?: boolean } = {},
	) {
		this._uiState.mode = mode;
		this._uiState.callback = callback;
		if (mode === "load") {
			this._uiState.loadMode = "select";
			this._uiState.isOnboarding = isOnboarding;
		}
		this.notifyAll();
	}

	close() {
		this.resetUiState();
		this.notifyAll();
	}

	scrollToFeedback() {
		setTimeout(() => {
			const el = document.getElementById("error-msg");
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		});
	}

	setError(msg: string) {
		this._uiState.message = {
			type: "error",
			message: msg,
		};
		this.notifyAll();
		this.scrollToFeedback();
	}
	setSuccess(msg: string) {
		this._uiState.message = {
			type: "success",
			message: msg,
		};
		this.notifyAll();
		this.scrollToFeedback();
	}
	closeFeedback() {
		this._uiState.message = null;
		this.notifyAll();
	}

	async loadPreset(id: number | "empty") {
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		if (id === "empty") {
			this.setSuccess("Empty preset loaded");
			this._uiState.callback({ components: {}, wires: {}, nextId: 0 }, "preset");
			return;
		}
		const preset = await API.getPresetById(id);
		if (!preset.success) {
			this.setError(preset.error);
			return;
		}
		this.setSuccess("Preset loaded");
		this._uiState.callback(preset.data.data, "preset");
	}
}

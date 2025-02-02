import { graph, graphManager } from "../actions";
import { API } from "../api";
import type { GraphData } from "../types";
import { ViewModel } from "./viewModel";

export type CircuitModalUiState =
	| {
			mode: null;
			callback: null;
			errorMessage: null;
			listRequestData: null;
			loadMode: null;
	  }
	| {
			mode: "load";
			errorMessage: string | null;
			callback: (graphData: GraphData) => void;
			listRequestData: ListRequestData | null;
			isLoadingList: boolean;
			loadMode: "select" | "list";
	  }
	| {
			mode: "save";
			errorMessage: string | null;
			callback: () => void;
			listRequestData: null;
			isLoadingList: false;
			loadMode: null;
	  };

type ListRequestData = {
	graphs: { name: string; id: number }[];
	pagination: {
		page: number;
		perPage: number;
		hasNextPage: boolean;
	};
} | null;

export class CircuitModalViewModel extends ViewModel<CircuitModalUiState> {
	protected _uiState: CircuitModalUiState = {
		mode: null,
		errorMessage: null,
		callback: null,
		listRequestData: null,
		loadMode: null,
	};

	protected resetUiState() {
		this._uiState = {
			mode: null,
			errorMessage: null,
			callback: null,
			listRequestData: null,
			loadMode: null,
		};
	}

	async copyCircuitToClipboard() {
		if (this._uiState.mode !== "save") {
			throw new Error("Invalid mode");
		}
		const graphData = graph.getData();
		const json = JSON.stringify(graphData);
		await navigator.clipboard.writeText(json);
		this._uiState.callback();
	}
	async pasteCircuitFromClipboard() {
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		const json = await navigator.clipboard.readText();
		try {
			const graphData = JSON.parse(json);

			// Validate data
			const validationResult = graphManager.validateData(graphData);
			if (!validationResult.success) {
				this.setError("Invalid data: " + validationResult.error.message);
				return;
			}
			this._uiState.callback(graphData);
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
		const graphData = graph.getData();
		const data = await API.saveCircuit(currentName, graphData);
		if (data.success) {
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
			this.setError(null);
			this.notifyAll();
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
			this._uiState.callback(data.data);
		} else {
			this.setError(data.error);
		}
	}

	open(
		mode: "save" | "load",
		callback: ((graphData: GraphData) => void) | null,
	) {
		this._uiState.mode = mode;
		this._uiState.callback = callback;
		if (mode === "load") {
			this._uiState.loadMode = "select";
		}
		this.notifyAll();
	}

	close() {
		this.resetUiState();
		this.notifyAll();
	}

	setError(msg: string | null) {
		this._uiState.errorMessage = msg;
		this.notifyAll();
	}
}

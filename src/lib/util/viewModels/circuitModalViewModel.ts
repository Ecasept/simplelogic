import { graphManager } from "../actions";
import { API } from "../api";
import type { GraphData } from "../types";
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
	  }
	| {
			mode: "load";
			message: FeedbackMessage | null;
			callback: (graphData: GraphData) => void;
			listRequestData: ListRequestData | null;
			isLoadingList: boolean;
			loadMode: "select" | "list";
	  }
	| {
			mode: "save";
			message: FeedbackMessage | null;
			callback: () => void;
			listRequestData: null;
			isLoadingList: false;
			loadMode: null;
	  };

type ListRequestData = {
	circuits: { name: string; id: number }[];
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
	};

	protected resetUiState() {
		this._uiState = {
			mode: null,
			message: null,
			callback: null,
			listRequestData: null,
			loadMode: null,
		};
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
			const graphData = JSON.parse(json);

			// Validate data
			const validationResult = graphManager.validateData(graphData);
			if (!validationResult.success) {
				this.setError("Invalid data: " + validationResult.error.message);
				return;
			}
			this.setSuccess("Circuit pasted from clipboard");
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
			this.setSuccess("Circuit loaded successfully");
			this._uiState.callback(data.data);
		} else {
			this.setError(data.error);
		}
	}

	async deleteCircuit(id: number) {
		if (this._uiState.mode !== "load") {
			throw new Error("Invalid mode");
		}
		const data = await API.deleteCircuit(id);
		if (data.success) {
			this.setSuccess("Circuit deleted successfully");
			const page = this._uiState.listRequestData?.pagination.page;
			this.loadCircuitList(page ?? 1);
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

	setError(msg: string) {
		this._uiState.message = {
			type: "error",
			message: msg,
		};
		this.notifyAll();
	}
	setSuccess(msg: string) {
		this._uiState.message = {
			type: "success",
			message: msg,
		};
		this.notifyAll();
	}
	closeFeedback() {
		this._uiState.message = null;
		this.notifyAll();
	}
}

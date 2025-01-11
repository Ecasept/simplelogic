import type { GraphData } from "../types";
import { graph } from "../actions";
import { ViewModel } from "./viewModel";
import { set } from "zod";
import { API } from "../api";

export type FileModalUiState =
	| {
			mode: null;
			callback: null;
			errorMessage: null;
			listRequestData: null;
	  }
	| {
			mode: "load";
			errorMessage: string | null;
			callback: (graphData: GraphData) => void;
			listRequestData: ListRequestData | null;
	  }
	| {
			mode: "save";
			errorMessage: string | null;
			callback: () => void;
			listRequestData: null;
	  };

type ListRequestData = {
	graphs: { name: string; id: number }[];
	pagination: {
		page: number;
		perPage: number;
		hasNextPage: boolean;
	};
} | null;

export class FileModalViewModel extends ViewModel<FileModalUiState> {
	protected _uiState: FileModalUiState = {
		mode: null,
		errorMessage: null,
		callback: null,
		listRequestData: null,
	};

	protected resetUiState() {
		this._uiState = {
			mode: null,
			errorMessage: null,
			callback: null,
			listRequestData: null,
		};
	}

	async saveCircuit(currentName: string) {
		const graphData = graph.getData();
		const data = await API.saveCircuit(currentName, graphData);
		if (data.success) {
			if (this._uiState.mode !== "save") {
				return;
			}
			this._uiState.callback();
		} else {
			this.setError(data.error);
		}
	}

	async loadCircuitList(page: number) {
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
		const data = await API.loadCircuit(id);
		if (data.success) {
			if (this._uiState.mode !== "load") {
				return;
			}
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
		this.notifyAll();
		if (mode === "load") {
			this.loadCircuitList(1);
		}
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

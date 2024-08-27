import type { APIResponse, GraphData } from "../types";
import { graph } from "../actions";
import { ViewModel } from "./viewModel";

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
		limit: number;
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

	saveGraph(currentName: string) {
		const data = graph.getData();
		fetch("/api/graphs", {
			method: "POST",
			body: JSON.stringify({
				name: currentName,
				data: data,
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		})
			.then((response) => response.json())
			.then((data: APIResponse<null>) => {
				if (data.success) {
					if (this._uiState.mode !== "save") {
						return;
					}
					this._uiState.callback();
				} else {
					this.setError(data.error);
				}
			});
	}

	async loadGraphList(page: number) {
		const response = await fetch(`/api/graphs?page=${page}&limit=10`, {
			method: "GET",
		});
		const data: APIResponse<ListRequestData> = await response.json();
		if (data.success) {
			this._uiState.listRequestData = data.data;
			this.notifyAll();
		} else {
			this.setError(data.error);
		}
	}

	loadGraph(id: number) {
		fetch(`/api/graphs/${id}`, {
			method: "GET",
		})
			.then((response) => response.json())
			.then((data: APIResponse<GraphData>) => {
				if (data.success) {
					if (this._uiState.mode !== "load") {
						return;
					}
					this._uiState.callback(data.data);
				} else {
					this.setError(data.error);
				}
			});
	}

	open(
		mode: "save" | "load",
		callback: ((graphData: GraphData) => void) | null,
	) {
		this._uiState.mode = mode;
		this._uiState.callback = callback;
		this.notifyAll();
		if (mode === "load") {
			this.loadGraphList(0);
		}
	}

	close() {
		this.resetUiState();
		this.notifyAll();
	}

	setError(msg: string) {
		this._uiState.errorMessage = msg;
		this.notifyAll();
	}
}

import type { APIResponse, GraphData } from "../types";
import { graph } from "./actions";
import { ViewModel } from "./viewModel";

export type FileModalUiState = {
	mode: "load" | "save" | null;
	message: string | null;
	messageType: "success" | "error" | null;
	callback: ((graphData: GraphData) => void) | null;
};

export class FileModalViewModel extends ViewModel<FileModalUiState> {
	protected _uiState: FileModalUiState = {
		mode: null,
		message: null,
		messageType: null,
		callback: null,
	};

	protected resetUiState() {
		this._uiState = {
			mode: null,
			message: null,
			messageType: null,
			callback: null,
		};
	}

	saveGraph(currentName: string) {
		const data = graph.getData();
		fetch("/api/save", {
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
					this.setSuccess("Saved");
				} else {
					this.setError(data.error);
				}
			});
	}

	loadGraph(currentName: string) {
		fetch("/api/load", {
			method: "POST",
			body: JSON.stringify({
				name: currentName,
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		})
			.then((response) => response.json())
			.then((data: APIResponse<GraphData>) => {
				if (data.success) {
					if (this._uiState.callback !== null) {
						this._uiState.callback(data.data);
					}
					this.setSuccess("Loaded");
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
	}

	close() {
		this.resetUiState();
		this.notifyAll();
	}

	setSuccess(msg: string) {
		this._uiState.message = msg;
		this._uiState.messageType = "success";
		this.notifyAll();
	}
	setError(msg: string) {
		this._uiState.message = msg;
		this._uiState.messageType = "error";
		this.notifyAll();
	}
}

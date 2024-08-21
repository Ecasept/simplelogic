import { graph } from "../graph";
import type { APIResponse, GraphData } from "../types";
import { ViewModel } from "./viewModel";

export type FileModalUiState = {
	state: "load" | "save" | null;
	message: string | null;
	messageType: "success" | "error" | null;
};

class FileModalViewModel extends ViewModel<FileModalUiState> {
	protected uiState: FileModalUiState = {
		state: null,
		message: null,
		messageType: null,
	};

	protected resetUiState() {
		this.uiState = {
			state: null,
			message: null,
			messageType: null,
		};
		this.notifyAll();
	}

	saveGraph(currentName: string) {
		const data = graph.getGraph();
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
					fileModalViewModel.setSuccess("Saved");
				} else {
					fileModalViewModel.setError(data.error);
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
					// canvasViewModel.resetUiState();
					// canvasViewModel.notifyAlll();
					// editorViewModel
					graph.loadGraph(data.data);
					fileModalViewModel.setSuccess("Loaded");
				} else {
					fileModalViewModel.setError(data.error);
				}
			});
	}

	openSaveGraph() {
		this.uiState.state = "save";
		this.notifyAll();
	}
	openLoadGraph() {
		this.uiState.state = "load";
		this.notifyAll();
	}

	close() {
		this.resetUiState();
	}

	setSuccess(msg: string) {
		this.uiState.message = msg;
		this.uiState.messageType = "success";
		this.notifyAll();
	}
	setError(msg: string) {
		this.uiState.message = msg;
		this.uiState.messageType = "error";
		this.notifyAll();
	}
}

export const fileModalViewModel = new FileModalViewModel();

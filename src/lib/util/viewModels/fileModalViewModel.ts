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

	saveGraph() {
		this.uiState.state = "save";
		this.notifyAll();
	}
	loadGraph() {
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

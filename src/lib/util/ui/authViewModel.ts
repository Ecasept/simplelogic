import { ViewModel } from "./viewModel";

export type AuthUiState = {
	open: boolean;
	message: string | null;
	loggedIn: boolean;
	passwordInputValue: string;
};

export class AuthViewModel extends ViewModel<AuthUiState> {
	protected _uiState: AuthUiState = {
		open: false,
		message: null,
		loggedIn: false,
		passwordInputValue: "",
	};
	protected resetUiState(): void {
		this._uiState = {
			open: false,
			message: null,
			loggedIn: false,
			passwordInputValue: "",
		};
	}

	setPasswordInputValue(val: string) {
		this._uiState.passwordInputValue = val;
		this.notifyAll();
	}

	setLoggedInState(state: boolean) {
		this._uiState.loggedIn = state;
		this.notifyAll();
	}
	toggleOpen() {
		this._uiState.open = !this._uiState.open;
		this.notifyAll();
	}
}

export const authViewModel = new AuthViewModel();

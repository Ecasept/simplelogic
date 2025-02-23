import { API } from "../api";
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
	async login() {
		this._uiState.message = "Logging in...";
		this.notifyAll();
		const data = await API.login(this._uiState.passwordInputValue);
		if (data.success) {
			this._uiState.message = null;
			this._uiState.loggedIn = true;
			this._uiState.passwordInputValue = "";
			this.notifyAll();
		} else {
			this._uiState.message = data.error;
			this.notifyAll();
		}
	}
	async logout() {
		this._uiState.message = "Logging out...";
		this.notifyAll();
		const data = await API.logout();
		if (data.success) {
			this._uiState.message = null;
			this._uiState.loggedIn = false;
			this.notifyAll();
		} else {
			this._uiState.message = data.error;
			this.notifyAll();
		}
	}
}

export const authViewModel = new AuthViewModel();

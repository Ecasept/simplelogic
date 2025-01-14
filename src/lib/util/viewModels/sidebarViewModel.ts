import type { APIResponse } from "../api";
import { ViewModel } from "./viewModel";

export type SidebarUiState = {
	open: boolean;
	message: string | null;
	loggedIn: boolean;
	passwordInputValue: string;
};

export class _SidebarViewModel extends ViewModel<SidebarUiState> {
	protected _uiState: SidebarUiState = {
		open: true,
		message: null,
		loggedIn: false,
		passwordInputValue: "",
	};
	protected resetUiState(): void {
		this._uiState = {
			open: true,
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
		const response = await fetch("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({
				password: this._uiState.passwordInputValue,
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			},
		});
		const data: APIResponse<null> = await response.json();
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
		const response = await fetch("/api/auth/logout", {
			method: "POST",
		});
		const data: APIResponse<null> = await response.json();
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

export const sidebarViewModel = new _SidebarViewModel();

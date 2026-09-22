export type AuthUiState = {
	open: boolean;
	message: string | null;
	loggedIn: boolean;
	passwordInputValue: string;
};

export class AuthViewModel {
	public uiState: AuthUiState = $state({
		open: false,
		message: null,
		loggedIn: false,
		passwordInputValue: "",
	});
	protected resetUiState(): void {
		this.uiState = {
			open: false,
			message: null,
			loggedIn: false,
			passwordInputValue: "",
		};
	}

	setPasswordInputValue(val: string) {
		this.uiState.passwordInputValue = val;
	}

	setLoggedInState(state: boolean) {
		this.uiState.loggedIn = state;
	}
	toggleOpen() {
		this.uiState.open = !this.uiState.open;
	}
}

export const authViewModel = new AuthViewModel();

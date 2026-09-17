export abstract class ViewModel<UiState> {
	protected abstract _uiState: UiState;
	public get uiState(): Readonly<UiState> {
		return this._uiState;
	}
	protected abstract resetUiState(): void;

	// ==== Store Contract ====

	private subscribers: ((uiState: UiState) => void)[] = [];

	subscribe(subscriber: (uiState: UiState) => void): () => void {
		this.subscribers.push(subscriber);
		subscriber(this._uiState);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index !== -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	notifyAll() {
		for (const subscriberFunc of this.subscribers) {
			subscriberFunc(this._uiState);
		}
	}
}

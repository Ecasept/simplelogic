import { describe, expect, it, vi } from "vitest";
import { ViewModel } from "./viewModel";

// Create a concrete implementation of ViewModel for testing
class TestViewModel extends ViewModel<{ count: number }> {
	protected uiState = { count: 0 };

	protected resetUiState(): void {
		this.uiState = { count: 0 };
	}

	incrementCount(): void {
		this.uiState = { count: this.uiState.count + 1 };
		this.notifyAll();
	}
}

describe("ViewModel", () => {
	it("should allow subscribing to state changes", () => {
		const viewModel = new TestViewModel();
		const subscriber = vi.fn();

		viewModel.subscribe(subscriber);
		expect(subscriber).toHaveBeenCalledWith({ count: 0 });
	});

	it("should notify subscribers when state changes", () => {
		const viewModel = new TestViewModel();
		const subscriber = vi.fn();

		viewModel.subscribe(subscriber);
		subscriber.mockClear(); // Clear initial call

		viewModel.incrementCount();
		expect(subscriber).toHaveBeenCalledWith({ count: 1 });
	});

	it("should allow unsubscribing", () => {
		const viewModel = new TestViewModel();
		const subscriber = vi.fn();

		const unsubscribe = viewModel.subscribe(subscriber);
		subscriber.mockClear(); // Clear initial call

		unsubscribe();
		viewModel.incrementCount();
		expect(subscriber).not.toHaveBeenCalled();
	});

	it("should notify multiple subscribers", () => {
		const viewModel = new TestViewModel();
		const subscriber1 = vi.fn();
		const subscriber2 = vi.fn();

		viewModel.subscribe(subscriber1);
		viewModel.subscribe(subscriber2);
		subscriber1.mockClear(); // Clear initial calls
		subscriber2.mockClear();

		viewModel.incrementCount();
		expect(subscriber1).toHaveBeenCalledWith({ count: 1 });
		expect(subscriber2).toHaveBeenCalledWith({ count: 1 });
	});

	it("should not notify unsubscribed subscribers", () => {
		const viewModel = new TestViewModel();
		const subscriber1 = vi.fn();
		const subscriber2 = vi.fn();

		const unsubscribe1 = viewModel.subscribe(subscriber1);
		viewModel.subscribe(subscriber2);
		subscriber1.mockClear(); // Clear initial calls
		subscriber2.mockClear();

		unsubscribe1();
		viewModel.incrementCount();
		expect(subscriber1).not.toHaveBeenCalled();
		expect(subscriber2).toHaveBeenCalledWith({ count: 1 });
	});

	it("should handle multiple subscriptions and unsubscriptions", () => {
		const viewModel = new TestViewModel();
		const subscriber1 = vi.fn();
		const subscriber2 = vi.fn();
		const subscriber3 = vi.fn();

		const unsubscribe1 = viewModel.subscribe(subscriber1);
		const unsubscribe2 = viewModel.subscribe(subscriber2);
		viewModel.subscribe(subscriber3);

		subscriber1.mockClear(); // Clear initial calls
		subscriber2.mockClear();
		subscriber3.mockClear();

		unsubscribe1();
		viewModel.incrementCount();
		expect(subscriber1).not.toHaveBeenCalled();
		expect(subscriber2).toHaveBeenCalledWith({ count: 1 });
		expect(subscriber3).toHaveBeenCalledWith({ count: 1 });

		unsubscribe2();
		subscriber2.mockClear(); // Clear previous calls
		viewModel.incrementCount();
		expect(subscriber1).not.toHaveBeenCalled();
		expect(subscriber2).not.toHaveBeenCalled();
		expect(subscriber3).toHaveBeenCalledWith({ count: 2 });
	});
});

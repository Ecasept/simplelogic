import { expect } from "@playwright/test";
import { circuits } from "./circuits";
import { getAttr, test } from "./common";

test.describe("modal login", () => {
	test("save modal login flow", async ({ page, editor }) => {
		await editor.openSaveModal();
		await expect(page.getByText("Sign in to")).toBeVisible();
		await editor.clickGoogleLoginButton();
		await expect(page.getByText("Sign in to")).not.toBeVisible();
		await editor.closeModal();
		await editor.openLoadModal();
		await expect(page.getByText("Sign in to")).not.toBeVisible();
		await editor.closeModal();
		await editor.signOut();
		await editor.openSaveModal();
		await expect(page.getByText("Sign in to")).toBeVisible();
	});
	test("load modal login flow", async ({ page, editor }) => {
		await editor.openLoadModal();
		await expect(page.getByText("Sign in to")).toBeVisible();
		await editor.clickGoogleLoginButton();
		await expect(page.getByText("Sign in to")).not.toBeVisible();
		await editor.closeModal();
		await editor.openSaveModal();
		await expect(page.getByText("Sign in to")).not.toBeVisible();
		await editor.closeModal();
		await editor.signOut();
		await editor.openLoadModal();
		await expect(page.getByText("Sign in to")).toBeVisible();
	});
});

test.describe("load modal", () => {
	test.beforeEach(async ({ editor }) => {
		await editor.signIn();
		await editor.toggleAccountButton();
	});

	test("click the load button with no circuits", async ({ page, editor }) => {
		// Open load modal
		await editor.openLoadModal();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Click "Load saved circuits" button when no circuits exist
		await editor.getLoadButton().click();

		// Should show the circuit list (even if empty)
		await expect(page.getByText("Loading...")).toBeVisible();
	});

	test("save a circuit, clear canvas and load it", async ({
		page,
		editor,
		browserName,
	}) => {
		const circuitName = `test_load_${browserName}_${Date.now()}`;

		// Add a component and save it
		await editor.addComponent("AND", 100, 200);
		await editor.openSaveModal();
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();
		await expect(page.getByText("Circuit saved successfully")).toBeVisible();
		await editor.closeModal();

		// Clear the canvas
		await page.getByRole("button", { name: "Clear canvas" }).click();
		await expect(editor.comps()).toHaveCount(0);

		// Load the circuit back
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText(circuitName)).toBeVisible();
		await page.getByText(circuitName).click();

		// Verify circuit was loaded
		await expect(page.getByText("Circuit loaded successfully")).toBeVisible();
		await expect(editor.comps()).toHaveCount(1);
	});

	test("can load with enter", async ({ page, editor, browserName }) => {
		const circuitName = `test_load_enter_${browserName}_${Date.now()}`;

		// Add a component and save it
		await editor.addComponent("OR", 150, 250);
		await editor.openSaveModal();
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();
		await expect(page.getByText("Circuit saved successfully")).toBeVisible();
		await editor.closeModal();

		// Clear the canvas
		await page.getByRole("button", { name: "Clear canvas" }).click();
		await expect(editor.comps()).toHaveCount(0);

		// Load the circuit using Enter key
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText(circuitName)).toBeVisible();

		// Focus the circuit item and press Enter
		await page.getByLabel(circuitName).focus();
		await page.keyboard.press("Enter");

		// Verify circuit was loaded
		await expect(page.getByText("Circuit loaded successfully")).toBeVisible();
		await expect(editor.comps()).toHaveCount(1);
	});

	test("can close success message from loading", async ({
		page,
		editor,
		browserName,
	}) => {
		const circuitName = `test_close_success_${browserName}_${Date.now()}`;

		// Add a component and save it
		await editor.addComponent("LED", 200, 300);
		await editor.openSaveModal();
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();
		await expect(page.getByText("Circuit saved successfully")).toBeVisible();
		await editor.closeModal();

		// Clear the canvas
		await page.getByRole("button", { name: "Clear canvas" }).click();
		await expect(editor.comps()).toHaveCount(0);

		// Load the circuit
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText(circuitName)).toBeVisible();
		await page.getByText(circuitName).click();

		// Verify success message appears
		await expect(page.getByText("Circuit loaded successfully")).toBeVisible();

		// Close the success message
		const closeButton = page.getByRole("button", {
			name: "Close",
			exact: true,
		});
		await closeButton.click();
		await expect(
			page.getByText("Circuit loaded successfully"),
		).not.toBeVisible();

		// Verify circuit is still loaded
		await expect(editor.comps()).toHaveCount(1);
	});
});

test.describe("save modal", () => {
	test.beforeEach(async ({ editor }) => {
		await editor.signIn();
		await editor.toggleAccountButton();
	});

	test("no circuit & can close error message", async ({ page, editor }) => {
		// Open save modal with no circuit
		await editor.openSaveModal();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Try to save without any circuit data
		await editor.getSaveButton().click();
		await expect(page.getByText("No data to save - please")).toBeVisible();

		// Test that we can close the error message
		const closeButton = page.getByRole("button", {
			name: "Close",
			exact: true,
		});
		await closeButton.click();
		await expect(page.getByText("No data to save - please")).not.toBeVisible();
	});

	test("save circuit without name", async ({ page, editor }) => {
		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// Open save modal
		await editor.openSaveModal();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Try to save without entering a name
		await editor.getSaveButton().click();
		await expect(page.getByText("Please enter a name")).toBeVisible();
	});

	test("can save circuit", async ({ page, editor, browserName }) => {
		const circuitName = `test_save_${browserName}_${Date.now()}`;

		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// Open save modal
		await editor.openSaveModal();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Enter a name and save
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();

		await expect(page.getByText("Circuit saved successfully")).toBeVisible();
	});

	test("can save with enter", async ({ page, editor, browserName }) => {
		const circuitName = `test_save_enter_${browserName}_${Date.now()}`;

		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// Open save modal
		await editor.openSaveModal();

		// Enter a name and press enter to save
		await editor.getNameInput().fill(circuitName);
		await editor.getNameInput().press("Enter");

		await expect(page.getByText("Circuit saved successfully")).toBeVisible();
	});

	test("can't save duplicate names", async ({ page, editor, browserName }) => {
		const circuitName = `test_duplicate_${browserName}_${Date.now()}`;

		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// First save - should succeed
		await editor.openSaveModal();
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();
		await editor.closeModal();

		// Second save with same name - should show error
		await editor.openSaveModal();
		await editor.getNameInput().fill(circuitName);
		await editor.getSaveButton().click();
		await expect(page.getByText("Name already exists")).toBeVisible();
	});

	test("error message can change into closeable success message", async ({
		page,
		editor,
		browserName,
	}) => {
		const name = `test_new_${browserName}_${Date.now()}`;

		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// First save without name - should show error
		await editor.openSaveModal();
		await editor.getSaveButton().click();
		await expect(page.getByText("Please enter a name")).toBeVisible();

		// Add a name and save (should get success)
		await editor.getNameInput().fill(name);
		await editor.getSaveButton().click();
		await expect(page.getByText("Circuit saved successfully")).toBeVisible();

		// Test that we can close the success message
		const closeButton = page.getByRole("button", {
			name: "Close",
			exact: true,
		});
		await closeButton.click();
		await expect(
			page.getByText("Circuit saved successfully"),
		).not.toBeVisible();
	});

	test("can close by clicking outside", async ({ page, pointer, editor }) => {
		// Add a component to have data to save
		await editor.addComponent("AND", 100, 200);

		// Open save modal
		await editor.openSaveModal();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Close modal by clicking outside
		await pointer.clickAt(50, 50);
		await expect(editor.getModal()).not.toBeVisible();
	});
});

test.describe("deleting circuits", () => {
	test.accountId("deleting-circuits");

	test.beforeEach(async ({ editor }) => {
		await editor.signIn();
		await editor.toggleAccountButton();
	});
	test("no circuits at beginning", async ({ page, editor }) => {
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText("No circuits found")).toBeVisible();
	});
	test("can delete a circuit", async ({ page, editor }) => {
		const circuitName = "test_delete_";
		for (let i = 0; i < 3; i++) {
			await editor.addComponent("AND", 100 + i * 50, 200 + i * 50);
			await editor.saveAs(circuitName + i);
		}
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText(circuitName)).toHaveCount(3);
		await editor.deleteCircuit(circuitName + "1");
		await expect(page.getByText(circuitName + "1")).not.toBeVisible();
		await editor.deleteCircuit(circuitName + "2");
		await editor.deleteCircuit(circuitName + "0");
		await expect(page.getByText("No circuits found")).toBeVisible();
	});
	test("deleting circuit wraps page", async ({ page, editor }) => {
		const PER_PAGE = 10; // Number of circuits per page
		const circuitName = "test_delete_wrap_";
		for (let i = 0; i < PER_PAGE * 2; i++) {
			await editor.addComponent("AND", 100 + i * 10, 200 + i * 10);
			await editor.saveAs(circuitName + i);
		}
		await editor.openLoadModal();
		await editor.getLoadButton().click();

		// Delete a circuit and expect a circuit from the next page to be visible
		await editor.deleteCircuit(circuitName + "5");
		await expect(page.getByText(circuitName + PER_PAGE)).toBeVisible();
	});

	test.describe("account wrapper", () => {
		test.accountId("delete-circuit-1");
		test("click delete on page when next page only has one, next page button goes to disabled", async ({
			page,
			editor,
		}) => {
			const PER_PAGE = 10;
			const circuitName = "test_delete_next_disable_";
			// Create exactly 11 circuits (10 on first page, 1 on second page)
			for (let i = 0; i < PER_PAGE + 1; i++) {
				await editor.addComponent("AND", 100 + i * 10, 200 + i * 10);
				await editor.saveAs(circuitName + i);
			}
			await editor.openLoadModal();
			await editor.getLoadButton().click();

			const nextButton = page.getByRole("button", { name: "Next page" });
			await expect(nextButton).not.toBeDisabled();

			// Delete a circuit
			await editor.deleteCircuit(circuitName + 1);

			// Only one page left
			await expect(nextButton).toBeDisabled();
		});
	});

	test.describe("account wrapper", () => {
		test.accountId("delete-circuit-2");
		test("click delete on page when page only has one circuit, goes to prev page", async ({
			page,
			editor,
		}) => {
			const PER_PAGE = 10;
			const circuitName = "test_delete_prev_page_";
			// Create exactly 11 circuits (10 on first page, 1 on second page)
			for (let i = 0; i < PER_PAGE + 1; i++) {
				await editor.addComponent("AND", 100 + i * 10, 200 + i * 10);
				await editor.saveAs(circuitName + i);
			}
			await editor.openLoadModal();
			await editor.getLoadButton().click();

			// Go to second page
			const nextButton = page.getByRole("button", { name: "Next page" });
			await nextButton.click();
			await expect(page.getByLabel("Pagination").getByText("2")).toBeVisible(); // Current page indicator
			await expect(page.getByText(circuitName + PER_PAGE)).toBeVisible();

			// Delete the only circuit on page 2 - should go back to page 1
			await editor.deleteCircuit(circuitName + PER_PAGE);

			// Should now be on page 1
			await expect(page.getByLabel("Pagination").getByText("1")).toBeVisible(); // Current page indicator
			await expect(page.getByText(circuitName + "0")).toBeVisible(); // First circuit should be visible
		});
	});
});

test.describe("pagination", () => {
	// Ensure empty circuit list
	test.use({
		extraHTTPHeaders: {
			"test-id": "pagination",
		},
	});
	test.beforeEach(async ({ editor }) => {
		await editor.signIn();
		await editor.toggleAccountButton();
	});

	test("pagination controls disabled when no circuits", async ({
		page,
		editor,
	}) => {
		await editor.openLoadModal();
		await editor.getLoadButton().click();
		await expect(page.getByText("No circuits found")).toBeVisible();

		// Pagination controls should not be enabled when there are no circuits
		const prevButton = page.getByRole("button", { name: "Previous page" });
		const nextButton = page.getByRole("button", { name: "Next page" });
		await expect(prevButton).toBeDisabled();
		await expect(nextButton).toBeDisabled();
	});

	test("pagination flow", async ({ page, editor }) => {
		const circuitName = "test_pagination_";
		// Add 11 circuits to test pagination
		for (let i = 0; i < 11; i++) {
			await editor.addComponent("AND", 100 + i * 10, 200 + i * 10);
			await editor.saveAs(circuitName + i);
		}
		await editor.openLoadModal();
		await editor.getLoadButton().click();

		// Initial state: left disabled, page 1 and right enabled
		const prevButton = page.getByRole("button", { name: "Previous page" });
		const nextButton = page.getByRole("button", { name: "Next page" });

		await expect(prevButton).toBeDisabled();
		await expect(
			page.getByLabel("Pagination controls").getByText("1"),
		).toBeVisible(); // Current page indicator
		await expect(nextButton).not.toBeDisabled();

		// Next page: left enabled, page 2 and right disabled (since we only have 11 items)
		await nextButton.click();
		await expect(prevButton).not.toBeDisabled();
		await expect(
			page.getByLabel("Pagination controls").getByText("2"),
		).toBeVisible(); // Current page indicator
		await expect(nextButton).toBeDisabled(); // Only 11 items total, so no page 3

		// Page 1 again: left disabled, page 1 and right enabled
		await prevButton.click();
		await expect(prevButton).toBeDisabled();
		await expect(
			page.getByLabel("Pagination controls").getByText("1"),
		).toBeVisible(); // Current page indicator
		await expect(nextButton).not.toBeDisabled();
	});

	test.describe("account wrapper", () => {
		test.accountId("pagination-1");
		test("pagination state resets on modal re-open", async ({
			page,
			editor,
		}) => {
			const circuitName = "test_pagination_reset_";
			// Add 11 circuits to test pagination
			for (let i = 0; i < 11; i++) {
				await editor.addComponent("AND", 100 + i * 10, 200 + i * 10);
				await editor.saveAs(circuitName + i);
			}
			await editor.openLoadModal();
			await editor.getLoadButton().click();

			// Go to second page
			const nextButton = page.getByRole("button", { name: "Next page" });
			await nextButton.click();
			await expect(
				page.getByLabel("Pagination controls").getByText("2"),
			).toBeVisible(); // Current page indicator

			// Close and reopen modal
			await editor.closeModal();
			await editor.openLoadModal();
			await editor.getLoadButton().click();

			// Should be back on page 1
			await expect(
				page.getByLabel("Pagination controls").getByText("1"),
			).toBeVisible(); // Current page indicator
			const prevButton = page.getByRole("button", { name: "Previous page" });
			await expect(prevButton).toBeDisabled();
		});
	});
});

test.describe("basic login", async () => {
	test("login", async ({ editor }) => {
		await editor.toggleAccountButton();
		const menu = editor.getAccountMenu();
		await expect(menu).toBeVisible();
		await expect(
			menu.getByRole("button", { name: "Continue with GitHub" }),
		).toBeVisible();
		await expect(
			menu.getByRole("button", { name: "Continue with Google" }),
		).toBeVisible();
		await editor.toggleAccountButton();
		await editor.signIn();
		await expect(editor.getAccountMenu().getByText("John Doe")).toBeVisible();
		await expect(
			editor.getAccountMenu().getByRole("button", { name: "Sign out" }),
		).toBeVisible();
		await editor.toggleAccountButton();
		await editor.signOut();
		await editor.toggleAccountButton();
		await expect(
			editor
				.getAccountMenu()
				.getByRole("button", { name: "Continue with GitHub" }),
		).toBeVisible();
	});
	test("login source should stay open after login", async ({
		page,
		editor,
	}) => {
		// Save modal should stay open
		await editor.openSaveModal();
		await editor.clickGoogleLoginButton();
		await expect(editor.getModal()).toBeVisible();
		await editor.closeModal();
		await editor.signOut();
		// Load modal should stay open
		await editor.openLoadModal();
		await editor.clickGoogleLoginButton();
		await expect(editor.getModal()).toBeVisible();
		await editor.closeModal();
		await editor.signOut();
		// Account menu should stay open
		await editor.toggleAccountButton();
		await editor.clickGoogleLoginButton();
		await expect(editor.getAccountMenu()).toBeVisible();
	});
});

test.describe("clipboard", () => {
	test("copy and paste", async ({ page, editor }) => {
		// Create 2 components connected by a wire
		await editor.addComponent("AND", 300, 400);
		await editor.addComponent("OR", 400, 500);
		const sourceHandle = editor.handles().nth(2);
		const targetHandle = editor.handles().nth(3);
		await editor.drag(sourceHandle, targetHandle);

		// Copy to clipboard
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Copy to clipboard" }).click();
		await expect(page.getByText("Copied to clipboard")).toBeVisible();

		// Reload page
		await editor.reload();

		// Paste from clipboard
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Paste from clipboard" }).click();
		await expect(page.getByText("Circuit pasted from clipboard")).toBeVisible();
		await editor.closeModal();

		// Check that the components were copied
		await expect(editor.comps()).toHaveCount(2);
		await expect(page.locator(".wire")).toHaveCount(1);

		// Check that components are correctly connected
		const initialD = await getAttr(page.locator(".wire").first(), "d");
		const component = editor.comps().first();
		await editor.dragTo(component, 50, 50);
		await expect(page.locator(".wire").first()).not.toHaveAttribute(
			"d",
			initialD,
		);
	});

	test("copy and paste while logged in ", async ({ page, editor }) => {
		await editor.signIn();
		await editor.loadCircuitUsingClipboard(circuits.SR_NOR_latch);
		const circuit = await editor.saveCircuitUsingClipboard();
		expect(circuit).toEqual(circuits.SR_NOR_latch);
	});

	test("paste invalid data", async ({ page }) => {
		// Copy invalid data to clipboard
		await page.evaluate(() => {
			navigator.clipboard.writeText("invalid data");
		});

		// Paste from clipboard
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Paste from clipboard" }).click();
		await expect(page.getByText("Invalid data")).toBeVisible();
		await page.getByRole("button", { name: "Close", exact: true }).click();

		// Test schema validation
		const invalidData =
			'{"components":{"0":{"type":"INVALID_TYPE","size":{"x":4,"y":4},"position":{"x":420,"y":260},"handles":{"in1":{"edge":"left","pos":1,"type":"input","connections":[]},"in2":{"edge":"left","pos":3,"type":"input","connections":[]},"out":{"edge":"right","pos":2,"type":"output","connections":[]}},"isPoweredInitially":false,"id":0}},"wires":{},"nextId":1}';

		// Copy invalid data to clipboard
		await page.evaluate((data) => {
			navigator.clipboard.writeText(data);
		}, invalidData);

		// Paste from clipboard
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Paste from clipboard" }).click();
		await expect(page.getByText("Invalid data")).toBeVisible();
	});
});

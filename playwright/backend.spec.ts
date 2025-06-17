import { expect } from "@playwright/test";
import { spawn } from "child_process";
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
		await expect(page.getByText(`${circuitName} id:`)).toBeVisible();
		await page.getByText(`${circuitName} id:`).click();

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
		await expect(page.getByText(`${circuitName} id:`)).toBeVisible();

		// Focus the circuit item and press Enter
		await page.getByText(`${circuitName} id:`).focus();
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
		await expect(page.getByText(`${circuitName} id:`)).toBeVisible();
		await page.getByText(`${circuitName} id:`).click();

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
		await editor.addComponent("AND", 100, 200);
		await editor.addComponent("OR", 200, 300);
		const sourceHandle = editor.handles().nth(2);
		const targetHandle = editor.handles().nth(3);
		await editor.drag(sourceHandle, targetHandle);

		// Copy to clipboard
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Copy to clipboard" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Reload page
		await editor.reload();

		// Paste from clipboard
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Paste from clipboard" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

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

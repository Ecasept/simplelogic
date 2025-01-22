import { expect } from "@playwright/test";
import { spawn } from "child_process";
import {
	addComponent,
	drag,
	dragHandle,
	getAttr,
	reload,
	test,
} from "./common";

test.describe("modal", async () => {
	test.beforeAll(async () => {
		// Clear database to prevent circuit list from being too long and needing multiple pages
		const cmd = spawn("npm", ["run", "cleardb"], {
			stdio: "inherit",
		});

		await new Promise<void>((resolve, reject) => {
			cmd.on("close", (code) => {
				if (code === 0) resolve();
				else reject(new Error(`Process exited with code ${code}`));
			});
		});
	});
	test("login flow", async ({ page }) => {
		// Can't save without being logged in
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("Please login")).toBeVisible();
		await page.getByRole("button", { name: "Close" }).click();

		// Can't load without being logged in
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Load from server" }).click();
		await expect(page.getByText("Please login")).toBeVisible();
		await page.getByRole("button", { name: "Close" }).click();

		// Sending no password
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByText("Incorrect password")).toBeVisible();

		// Sending incorrect password
		await page.locator('input[type="password"]').fill("incorrect password");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByText("Incorrect password")).toBeVisible();

		// Sending correct password
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeVisible();

		// Still logged in after reload
		await reload(page);
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeVisible();

		// Log out
		await page.getByRole("button", { name: "Log out" }).click();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();

		// Still logged out after reload
		await reload(page);
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();

		// Log in and log out straight after
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeVisible();

		await page.getByRole("button", { name: "Log out" }).click();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});
	test("save flow", async ({ page, browserName }) => {
		const graphName = `test_${browserName}_${Date.now()}`;

		// Login
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

		// Open Modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();

		// Save without data
		await page.locator('input[type="text"]').click();
		await page.locator('input[type="text"]').fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("No data to save - please")).toBeVisible();
		// Close modal and add data
		await page.getByRole("button", { name: "Close" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();
		await addComponent(page, "AND", 100, 200);

		// Open modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Save without name
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("Please enter a name")).toBeVisible();
		// Save with name
		await page.locator('input[type="text"]').click();
		await page.locator('input[type="text"]').fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Open modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Save with existing name
		await page.locator('input[type="text"]').click();
		await page.locator('input[type="text"]').fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("Name already exists")).toBeVisible();
		// Close modal
		await page.getByRole("button", { name: "Close" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Reload page
		await reload(page);
		// Open modal
		await page.getByRole("button", { name: "Load" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		await page.getByRole("button", { name: "Load from server" }).click();
		// Select graph
		await expect(page.getByText(`${graphName} id:`)).toBeVisible();
		await page.getByText(`${graphName} id:`).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();
		await expect(page.locator(".component-body")).toHaveCount(1);
	});
	test("discards changes", async ({ page }) => {
		await page.getByText("AND", { exact: true }).click();
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".component-body")).toHaveCount(0);
	});
	test("enter selects circuit", async ({ page, browserName }) => {
		const graphName = `test_enter_${browserName}_${Date.now()}`;

		// Login
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();

		// Create a circuit
		await addComponent(page, "AND", 100, 200);

		// Save the circuit
		await page.getByRole("button", { name: "Save" }).click();
		await page.locator('input[type="text"]').fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Reload page
		await reload(page);

		// Open load modal and select with Enter
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Load from server" }).click();
		await expect(page.getByText(`${graphName} id:`)).toBeVisible();
		await page.getByText(`${graphName} id:`).focus();
		await page.keyboard.press("Enter");
		await expect(page.locator(".modal-bg")).not.toBeVisible();
		await expect(page.locator(".component-body")).toHaveCount(1);
	});
	test("copy and paste", async ({ page, browserName }) => {
		// Create 2 components connected by a wire
		await addComponent(page, "AND", 100, 200);
		await addComponent(page, "OR", 200, 300);
		const sourceHandle = page.locator("circle.handle").nth(2);
		const targetHandle = page.locator("circle.handle").nth(3);
		await dragHandle(sourceHandle, targetHandle, page);

		// Copy to clipboard
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Copy to clipboard" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Reload page
		await reload(page);

		// Paste from clipboard
		await page.getByRole("button", { name: "Load" }).click();
		await page.getByRole("button", { name: "Paste from clipboard" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Check that the components were copied
		await expect(page.locator(".component-body")).toHaveCount(2);
		await expect(page.locator(".wire")).toHaveCount(1);

		// Check that components are correctly connected
		const initialD = await getAttr(page.locator(".wire").first(), "d");
		const component = page.locator(".component-body").first();
		await drag(component, 50, 50, page);
		await expect(page.locator(".wire").first()).not.toHaveAttribute(
			"d",
			initialD,
		);
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
		await page.getByRole("button", { name: "Close" }).click();

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

import test, { expect } from "@playwright/test";
import { isContext } from "vm";

test.describe("modal", async () => {
	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});
	test("login flow", async ({ page }) => {
		// Can't save without being logged in
		await page.getByRole("button", { name: "Save" }).click();
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("Not logged in")).toBeVisible();
		await page.getByRole("button", { name: "x" }).click();

		// Can't load without being logged in
		await page.getByRole("button", { name: "Load" }).click();
		await expect(page.getByText("Not logged in")).toBeVisible();
		await page.getByRole("button", { name: "x" }).click();

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
		await expect(page.locator('input[type="password"]')).toBeDisabled();

		// Still logged in after reload
		await page.reload();
		await page.waitForLoadState("networkidle");
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeDisabled();

		// Log out
		await page.getByRole("button", { name: "Log out" }).click();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeDisabled();

		// Still logged out after reload
		await page.reload();
		await page.waitForLoadState("networkidle");
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeDisabled();

		// Log in and log out straight after
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeDisabled();

		await page.getByRole("button", { name: "Log out" }).click();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
		await expect(page.locator('input[type="password"]')).not.toBeDisabled();
	});
	test("save flow", async ({ page, browser }) => {
		const graphName = `test_${browser.browserType().name()}_${Date.now()}`;

		// Login
		await page
			.locator('input[type="password"]')
			.fill(process.env.PASSWORD ?? "");
		await page.getByRole("button", { name: "Login" }).click();

		// Open Modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Save without data
		await page.locator('input[type="text"]').click();
		await page.locator('input[type="text"]').fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.getByText("No data to save - please")).toBeVisible();
		// Close modal and add data
		await page.getByRole("button", { name: "x" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(100, 200);

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
		await page.getByRole("button", { name: "x" }).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Reload page
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		// Open modal
		await page.getByRole("button", { name: "Load" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Select graph
		await expect(page.getByText(`${graphName} id:`)).toBeVisible();
		await page.getByText(`${graphName} id:`).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();
		expect(await page.locator("rect").count()).toBe(2);
	});
	test("discards changes", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.getByRole("button", { name: "Save" }).click();
		expect(await page.locator("rect").count()).toBe(1);
	});
});

/*
{
	"stack": "    at functionsWorker-0.896388872539319.js:6:9
    at node_modules/safe-buffer/index.js (functionsWorker-0.896388872539319.js:296:18)
    at __require22 (functionsWorker-0.896388872539319.js:27:50)
    at node_modules/jws/lib/sign-stream.js (functionsWorker-0.896388872539319.js:813:19)
    at __require22 (functionsWorker-0.896388872539319.js:27:50)
    at node_modules/jws/index.js (functionsWorker-0.896388872539319.js:989:22)
    at __require22 (functionsWorker-0.896388872539319.js:27:50)
    at node_modules/jsonwebtoken/decode.js (functionsWorker-0.896388872539319.js:1020:15)
    at __require22 (functionsWorker-0.896388872539319.js:27:50)
    at node_modules/jsonwebtoken/index.js (functionsWorker-0.896388872539319.js:3896:15)",
	"name": "Error",
	"message": "Dynamic require of \"node:buffer\" is not supported",
	"timestamp": 1724768954028
  }
	*/

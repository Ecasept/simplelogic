import test, { expect } from "@playwright/test";

test.describe("modal", async () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});
	test("save flow", async ({ page, browser }) => {
		const graphName = `test_${browser.browserType().name()}_${Date.now()}`;

		// Open Modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Save without data
		await page.getByRole("textbox").click();
		await page.getByRole("textbox").fill(graphName);
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
		await page.getByRole("textbox").click();
		await page.getByRole("textbox").fill(graphName);
		await page.getByRole("button", { name: "Save" }).nth(1).click();
		await expect(page.locator(".modal-bg")).not.toBeVisible();

		// Open modal
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".modal-bg")).toBeVisible();
		// Save with existing name
		await page.getByRole("textbox").click();
		await page.getByRole("textbox").fill(graphName);
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

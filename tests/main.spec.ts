import test, { expect } from "@playwright/test";

test.describe("basic", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});
});

test("has title", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle(/SimpleLogic/);
});

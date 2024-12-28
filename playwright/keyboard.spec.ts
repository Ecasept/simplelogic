import test, { expect, Locator } from "@playwright/test";

async function expectPosToBe(component: Locator, x: number, y: number) {
	const boundingBox = (await component.boundingBox())!;

	expect(boundingBox).not.toBeNull();

	const centerX = boundingBox.x + boundingBox.width / 2;
	const centerY = boundingBox.y + boundingBox.height / 2;

	// 31 because of snapping + 5 for other inaccuracies
	expect(Math.abs(centerX - x)).toBeLessThan(35);
	expect(Math.abs(centerY - y)).toBeLessThan(35);
}

test.describe("editor shortcuts", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});

	test("a adds AND gate", async ({ page }) => {
		await page.keyboard.press("A");
		await page.mouse.click(100, 100);

		const component = page.locator("rect").nth(1);
		await expect(component).toBeVisible();
		await expectPosToBe(component, 100, 100);
	});

	test("o adds OR gate", async ({ page }) => {
		await page.keyboard.press("O");
		await page.mouse.click(200, 200);

		const component = page.locator("rect").nth(1);
		await expect(component).toBeVisible();
		await expectPosToBe(component, 200, 200);
	});

	test("a then o changes what is added", async ({ page }) => {
		await page.keyboard.press("A");
		await page.keyboard.press("O");
		await page.mouse.click(300, 300);

		expect(await page.locator("rect").count()).toBe(2);
		const component = page.locator("rect").nth(1);
		await expect(component).toBeVisible();
		await expectPosToBe(component, 300, 300);
	});

	test("ctrl+s opens save dialog and escape closes it", async ({ page }) => {
		await page.keyboard.press("Control+S");
		await expect(page.locator(".modal-bg")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Save" }).nth(1),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".modal-bg")).not.toBeVisible();
	});

	test("ctrl+l opens load dialog and escape closes it", async ({ page }) => {
		await page.keyboard.press("Control+L");
		await expect(page.locator(".modal-bg")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".modal-bg")).not.toBeVisible();
	});

	test("moving component then a resets component and adds AND gate", async ({
		page,
	}) => {
		// Add initial component
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(100, 100);

		// Start moving component
		const component = page.locator("rect").nth(1);
		await component.hover();
		await page.mouse.down();
		await page.mouse.move(200, 200);

		// Press A
		await page.keyboard.press("A");

		// Check that original component is back at initial position
		await expectPosToBe(component, 100, 100);

		// Check that new AND gate is added at cursor position
		await page.mouse.click(200, 200);
		const newComponent = page.locator("rect").nth(2);
		await expect(newComponent).toBeVisible();
		await expectPosToBe(newComponent, 200, 200);
	});

	test("ctrl+z undoes last action", async ({ page }) => {
		// Add a component
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(100, 100);

		expect(await page.locator("rect").count()).toBe(2); // Including background rect

		// Undo
		await page.keyboard.press("Control+Z");

		expect(await page.locator("rect").count()).toBe(1); // Only background rect remains
	});
});

import test, { expect } from "@playwright/test";
import { addComponent, expectPosToBe, reload } from "./common";

test.describe("editor shortcuts", () => {
	test.beforeEach(async ({ page }) => {
		await reload(page);
	});

	test("a adds AND gate", async ({ page }) => {
		await page.keyboard.press("A");
		await page.mouse.click(100, 100);

		const component = page.locator(".component-body");
		await expect(component).toBeVisible();
		await expectPosToBe(component, 100, 100);
	});

	test("o adds OR gate", async ({ page }) => {
		await page.keyboard.press("O");
		await page.mouse.click(200, 200);

		const component = page.locator(".component-body");
		await expect(component).toBeVisible();
		await expectPosToBe(component, 200, 200);
	});

	test("a then o changes what is added", async ({ page }) => {
		await page.keyboard.press("A");
		await page.keyboard.press("O");
		await page.mouse.click(300, 300);

		await expect(page.locator(".component-body")).toHaveCount(1);
		const component = page.locator(".component-body");
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
		await addComponent(page, "AND", 100, 100);

		// Start moving component
		const component = page.locator(".component-body").first();
		await component.hover();
		await page.mouse.down();
		await page.mouse.move(200, 200);

		// Press A
		await page.keyboard.press("A");

		// Check that original component is back at initial position
		await expectPosToBe(component, 100, 100);

		// Check that new AND gate is added at cursor position
		await page.mouse.click(200, 200);
		const newComponent = page.locator(".component-body").nth(1);
		await expect(newComponent).toBeVisible();
		await expectPosToBe(newComponent, 200, 200);
	});

	test("ctrl+z undoes last action", async ({ page }) => {
		// Add a component
		await addComponent(page, "AND", 100, 100);

		await expect(page.locator(".component-body")).toHaveCount(1);

		// Undo
		await page.keyboard.press("Control+Z");

		await expect(page.locator(".component-body")).toHaveCount(0);
	});

	test("escape cancels delete mode", async ({ page }) => {
		await expect(page.getByText("Editing Mode: Normal")).toBeVisible();
		await page.keyboard.press("d");
		await expect(page.getByText("Editing Mode: Delete")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByText("Editing Mode: Normal")).toBeVisible();
	});
});

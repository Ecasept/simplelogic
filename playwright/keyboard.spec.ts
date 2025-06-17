import { expect, expectPosToBe, test } from "./common";

test.describe("editor shortcuts", () => {
	test("a adds AND gate", async ({ page, pointer, editor }) => {
		await page.keyboard.press("A");
		await pointer.clickAt(100, 100);

		const component = editor.comps();
		await expect(component).toBeVisible();
		await expectPosToBe(component, 100, 100);
	});

	test("o adds OR gate", async ({ page, pointer, editor }) => {
		await page.keyboard.press("O");
		await pointer.clickAt(200, 200);

		const component = editor.comps();
		await expect(component).toBeVisible();
		await expectPosToBe(component, 200, 200);
	});

	test("a then o changes what is added", async ({ page, pointer, editor }) => {
		await page.keyboard.press("A");
		await page.keyboard.press("O");
		await pointer.clickAt(300, 300);

		await expect(editor.comps()).toHaveCount(1);
		const component = editor.comps();
		await expect(component).toBeVisible();
		await expectPosToBe(component, 300, 300);
	});

	test("ctrl+s opens save dialog and escape closes it", async ({
		page,
		editor,
	}) => {
		await page.keyboard.press("Control+S");
		await expect(page.locator(".modal-bg")).toBeVisible();
		await expect(editor.getModal()).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".modal-bg")).not.toBeVisible();
	});

	test("ctrl+l opens load dialog and escape closes it", async ({ page }) => {
		await page.keyboard.press("Control+L");
		await expect(page.locator(".modal-bg")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".modal-bg")).not.toBeVisible();
	});

	test("ctrl+z undoes last action", async ({ page, editor }) => {
		// Add a component
		await editor.addComponent("AND", 100, 100);

		await expect(editor.comps()).toHaveCount(1);

		// Undo
		await page.keyboard.press("Control+Z");

		await expect(editor.comps()).toHaveCount(0);
	});

	test("escape cancels delete mode", async ({ page }) => {
		await expect(page).toHaveMode("edit");
		await page.keyboard.press("d");
		await expect(page).toHaveMode("delete");
		await page.keyboard.press("Escape");
		await expect(page).toHaveMode("edit");
	});
	test("d toggles delete mode", async ({ page, editor }) => {
		// add component
		await editor.addComponent("AND", 200, 200);
		await expect(editor.comps()).toHaveCount(1);

		// press d
		await page.keyboard.press("d");

		// verify delete mode
		await expect(page).toHaveMode("delete");

		// delete component
		await editor.comps().click();

		// verify component is deleted
		await expect(editor.comps()).toHaveCount(0);

		// press d
		await page.keyboard.press("d");

		// verify not in delete mode
		await expect(page).toHaveMode("edit");
	});
});
test.describe("shortcut interactions", () => {
	test("moving component then pressing a does nothing", async ({
		page,
		editor,
		pointer,
	}) => {
		// Add initial component
		await editor.addComponent("AND", 300, 300);

		// Start moving component
		const component = editor.comps().first();
		await component.hover();
		await pointer.down();
		await pointer.moveTo(400, 400);

		// Press A
		await page.keyboard.press("A");

		// Check that component is still the same
		await expectPosToBe(component, 400, 400);
		await expect(editor.comps()).toHaveCount(1);
	});
	test("correct highlighting when switching modes while hovering", async ({
		editor,
		page,
	}) => {
		// add component
		await editor.addComponent("AND", 300, 300);

		// hover over component
		await editor.comps().hover();

		await page.keyboard.press("d");

		// verify highlighting
		await expect(editor.comps()).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.keyboard.press("s");

		// verify highlighting gone
		await expect(editor.comps()).not.toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.keyboard.press("d");

		// verify highlighting
		await expect(editor.comps()).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.keyboard.press("Escape");

		// verify highlighting gone
		await expect(editor.comps()).not.toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);
	});
	test("clearing canvas while adding wire still clears canvas", async ({
		editor,
		page,
		pointer,
	}) => {
		// add component
		await editor.addComponent("AND", 500, 300);

		// start adding wire
		const handle = editor.getHandle("AND", "out").first();
		await editor.dragToNoRelease(handle, 600, 400);

		// clear canvas
		await page.keyboard.press("Shift+C");

		// Release pointer
		await pointer.up();

		// verify canvas is cleared
		await expect(editor.comps()).toHaveCount(0);
	});
});

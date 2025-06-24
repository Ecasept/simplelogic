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

	test("delete selected element", async ({ page, editor }) => {
		// Add a component
		await editor.addComponent("AND", 500, 500);
		await expect(editor.comps()).toHaveCount(1);

		// Component should already be selected
		await expect(editor.comps()).toBeSelected();

		// Press delete
		await page.keyboard.press("Delete");

		// Verify component is deleted
		await expect(editor.comps()).toHaveCount(0);
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

test.describe("rotation shortcuts", () => {
	test("r rotates selected component clockwise", async ({ page, editor }) => {
		// Add a component
		await editor.addComponent("AND", 300, 300);
		const component = editor.comps();

		// Component should already be selected
		await expect(component).toBeSelected();

		// Press R to rotate clockwise
		await page.keyboard.press("r");

		// Verify component is rotated 90 degrees
		await expect(component).toBeRotated(90);
	});

	test("shift+r rotates selected component counter-clockwise", async ({
		page,
		editor,
	}) => {
		// Add a component
		await editor.addComponent("AND", 400, 400);
		const component = editor.comps();

		// Component should already be selected
		await expect(component).toBeSelected();

		// Press Shift+R to rotate counter-clockwise
		await page.keyboard.press("Shift+R");

		// Verify component is rotated -90 degrees (270 degrees)
		await expect(component).toBeRotated(270);
	});

	test("multiple rotations work correctly", async ({ page, editor }) => {
		// Add a component
		await editor.addComponent("OR", 200, 200);
		const component = editor.comps();

		// Component should already be selected
		await expect(component).toBeSelected();

		// Rotate clockwise 3 times
		await page.keyboard.press("r");
		await expect(component).toBeRotated(90);

		await page.keyboard.press("r");
		await expect(component).toBeRotated(180);

		await page.keyboard.press("r");
		await expect(component).toBeRotated(270);

		// One more rotation should bring it back to 0
		await page.keyboard.press("r");
		await expect(component).toBeRotated(0);
	});

	test("rotation shortcuts do nothing when no component is selected", async ({
		page,
		editor,
		pointer,
	}) => {
		// Add a component but don't select it
		await editor.addComponent("AND", 300, 300);
		const component = editor.comps();

		// Deselect component
		await pointer.clickOn(component);
		await expect(component).not.toBeSelected();

		// Get initial rotation
		const initialRotation = await component.getAttribute("transform");

		// Press R - should do nothing
		await page.keyboard.press("r");

		// Verify rotation hasn't changed
		await expect(component).toHaveAttribute("transform", initialRotation);

		// Press Shift+R - should also do nothing
		await page.keyboard.press("Shift+R");

		// Verify rotation still hasn't changed
		await expect(component).toHaveAttribute("transform", initialRotation);
	});

	test("rotation works with wire connections", async ({ page, editor }) => {
		// Add component and connect wires
		await editor.addComponent("AND", 400, 300);
		const component = editor.comps();

		// Connect wires to test rotation with connections
		const inputHandle = editor.getHandle("AND", "in1").first();
		const outputHandle = editor.getHandle("AND", "out").first();

		await editor.dragTo(inputHandle, 300, 200);
		await editor.dragTo(outputHandle, 500, 350);

		// Verify wires are created
		await expect(editor.wires()).toHaveCount(2);

		// Get initial wire paths
		const wire1 = editor.wires().first();
		const wire2 = editor.wires().nth(1);
		const initialPath1 = await wire1.getAttribute("d");
		const initialPath2 = await wire2.getAttribute("d");

		// Select component and rotate
		await component.click();
		await page.keyboard.press("r");

		// Verify component is rotated
		await expect(component).toBeRotated(90);

		// Verify wires have moved with the rotation
		await expect(wire1).not.toHaveAttribute("d", initialPath1);
		await expect(wire2).not.toHaveAttribute("d", initialPath2);
	});

	test("rotate while adding and moving", async ({ page, editor, pointer }) => {
		// drag a new component and rotate it while dragging
		await page.keyboard.press("A");
		await pointer.downAt(200, 200);
		await pointer.moveTo(300, 300);
		await page.keyboard.press("r");
		await pointer.up();

		const component = editor.comps();
		await expect(component).toHaveCount(1);
		await expectPosToBe(component, 300, 300);
		await expect(component).toBeRotated(90);

		// move it and rotate it again while doing so (in the opposite dir)
		await pointer.downAt(300, 300);
		await pointer.moveTo(400, 200);
		await page.keyboard.press("Shift+R");
		await pointer.up();

		await expectPosToBe(component, 400, 200);
		await expect(component).toBeRotated(0);

		// move it again, verify still rotated
		await pointer.downAt(400, 200);
		await pointer.moveTo(500, 500);
		await pointer.up();

		await expectPosToBe(component, 500, 500);
		await expect(component).toBeRotated(0);

		// undo, verify rotated and pos
		await page.keyboard.press("Control+Z");
		await expect(component).toBeVisible();
		await expectPosToBe(component, 400, 200);
		await expect(component).toBeRotated(0);

		// undo, verify rotated and pos
		await page.keyboard.press("Control+Z");
		await expect(component).toBeVisible();
		await expectPosToBe(component, 300, 300);
		await expect(component).toBeRotated(90);

		// undo, verify does not exist
		await page.keyboard.press("Control+Z");
		await expect(editor.comps()).toHaveCount(0);
	});
});

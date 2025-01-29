import { expect } from "@playwright/test";
import { circuits } from "./circuits";
import { expectPosToBe, getAttr, getAttrs, loadCircuit, test } from "./common";

test.describe("adding and dragging/moving", async () => {
	test("adds component at correct position", async ({ page, editor }) => {
		await editor.addComponent("AND", 100, 200);

		const component = editor.comp().first();
		await expect(component).toBeVisible();

		await expectPosToBe(component, 100, 200);
	});
	test("adds component and discards", async ({ page, hasTouch, editor }) => {
		test.skip(hasTouch, "Can't press escape on touch devices");
		await page.getByText("AND", { exact: true }).click();

		await page.keyboard.press("Escape");
		await expect(editor.comp()).toHaveCount(0);
	});
	test("adds multiple components", async ({ editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.addComponent("OR", 200, 100);
		await editor.addComponent("AND", 200, 100);
		await editor.addComponent("OR", 100, 200);

		await expect(editor.comp().first()).toBeVisible();
		await expect(editor.comp().nth(1)).toBeVisible();
		await expect(editor.comp().nth(2)).toBeVisible();
		await expect(editor.comp().nth(3)).toBeVisible();
	});

	test("drags and moves new wires", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		// Click handle
		const originalHandle = page.locator("circle.handle").nth(2);
		await originalHandle.hover();
		await expect(originalHandle).toHaveAttribute("r", "10");
		await pointer.down();

		// Move handle
		const handle = page.locator("circle.handle").nth(2);
		await pointer.moveTo(300, 300);
		await expectPosToBe(handle, 300, 300);
		await expect(page.locator(".wire").first()).toBeVisible();

		// Move handle
		await pointer.moveTo(400, 400);
		await expectPosToBe(handle, 400, 400);

		// Release and move mouse
		await pointer.up();
		await pointer.moveTo(200, 200);
		await expectPosToBe(page.locator("circle.handle").nth(3), 400, 400);
		await expect(page.locator("circle.handle")).toHaveCount(4);
	});
	test("drags new wire and discards", async ({ page, editor, pointer }) => {
		test.skip(false, "Can't press escape on touch devices");
		await editor.addComponent("AND", 100, 200);
		await expect(editor.comp()).toBeVisible();

		const handle = page.locator("circle").nth(2);
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Drag Wire
		await handle.hover();
		await pointer.down();
		await pointer.moveTo(300, 300);

		await page.keyboard.press("Escape");

		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);
	});
	test("drags wires with components", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 500, 500);

		const handle = page.locator("circle.handle").first();
		await handle.hover();
		await pointer.down();
		await pointer.moveTo(100, 100);
		await pointer.up();

		const d1 = await getAttr(page.locator(".wire"), "d");
		await editor.comp().hover();
		await pointer.down();
		await pointer.moveTo(200, 300);
		await pointer.up();
		await expect(page.locator(".wire")).not.toHaveAttribute("d", d1);
	});
	test("drags and connects wires flow", async ({
		page,
		editor,
		pointer,
		hasTouch,
	}) => {
		// Setup: Add component
		await editor.addComponent("AND", 100, 100);

		// Setup: Drag wire
		let sourceHandle = page.locator("circle.handle").first();
		await editor.dragTo(sourceHandle, 500, 500);

		// 1. Drag and release
		const wire = page.locator(".wire");
		const handle = page.locator("circle.handle").nth(2);
		await editor.dragTo(handle, 400, 400);

		// 2. Drag but not release
		const initialD = await getAttr(wire, "d");
		await pointer.downOn(handle);
		await pointer.moveTo(150, 150);
		await expectPosToBe(page.locator("circle.handle").nth(1), 150, 150);
		await expect(wire).not.toHaveAttribute("d", initialD);

		// 3. Press escape (or undo if on mobile)
		if (hasTouch) {
			await pointer.up();
			await editor.undo();
		} else {
			await page.keyboard.press("Escape");
			await pointer.up();
		}
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 3.5 Drag and connect
		await editor.addComponent("XOR", 300, 300);

		sourceHandle = editor.getHandle("AND", "out").first();
		const targetHandle = editor.getHandle("XOR", "in1").first();
		await editor.drag(sourceHandle, targetHandle);

		await expect(page.locator(".wire").last()).toHaveAttribute(
			"d",
			"M121 81 L201 221",
		);
		await editor.undo();
		await editor.undo();

		// 4. Drag
		await editor.dragTo(handle, 250, 250);

		// 5. Undo
		await editor.undo();
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 6. Move component
		const component = editor.comp();
		await editor.dragTo(component, 50, 50);
		await expectPosToBe(handle, 400, 400);
		await expect(wire).not.toHaveAttribute("d", initialD);

		// Undo
		await editor.undo();
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 7. Undo twice (should remove the wire)
		await editor.undo();
		await editor.undo();
		await expect(page.locator(".wire")).toHaveCount(0);
	});
	test("moves components correctly", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		await pointer.down();
		await pointer.moveTo(500, 50);
		await expectPosToBe(editor.comp(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comp(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comp(), 400, 300);
	});
	test("moves component and discards", async ({ page, editor, hasTouch }) => {
		test.skip(hasTouch, "Can't press escape on touch devices");
		await editor.addComponent("AND", 100, 200);
		await expect(editor.comp()).toBeVisible();

		const component = editor.comp();
		const [x1, y1] = await getAttrs(component, "x", "y");
		await page.keyboard.press("Escape");

		await expect(component).toHaveAttribute("x", x1);
		await expect(component).toHaveAttribute("y", y1);
	});
	test("can connect multiple wires from component output", async ({
		page,
		editor,
	}) => {
		await editor.addComponent("AND", 100, 300);

		const handle = page.locator("circle.handle").nth(2);
		await editor.dragTo(handle, 300, 100);
		await editor.dragTo(handle, 300, 500);

		await expect(page.locator(".wire")).toHaveCount(2);

		// Move component and check if wires move too
		const d1 = await getAttr(page.locator(".wire").nth(0), "d");
		const d2 = await getAttr(page.locator(".wire").nth(1), "d");

		await editor.dragTo(editor.comp(), 100, 100);
		await expectPosToBe(editor.comp(), 100, 100);

		await expect(page.locator(".wire").nth(0)).not.toHaveAttribute("d", d1);
		await expect(page.locator(".wire").nth(1)).not.toHaveAttribute("d", d2);
	});
});

test.describe("other", () => {
	test("has title", async ({ page }) => {
		await expect(page).toHaveTitle("SimpleLogic");
	});

	test("toggles sidebar correctly", async ({ page, pointer }) => {
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
		await pointer.clickOn(page.getByRole("button", { name: "▶" }));
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(0);
		await pointer.clickOn(page.getByRole("button", { name: "▶" }));
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
	});

	test("snaps", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		await pointer.downAt(100, 200);
		await pointer.moveTo(20, 20);
		const boundingBox1 = (await editor.comp().boundingBox())!;
		await pointer.moveTo(15, 15);
		const boundingBox2 = (await editor.comp().boundingBox())!;
		expect(boundingBox1).toStrictEqual(boundingBox2);
	});

	test("undo", async ({ page, editor, pointer, hasTouch }) => {
		// Add components
		await editor.addComponent("AND", 300, 300);
		await editor.addComponent("AND", 500, 500);

		// Move Component
		await editor.comp().nth(1).hover();
		await pointer.down();
		await pointer.moveTo(100, 100);
		await pointer.up();

		const handle = page.locator("circle").nth(4);
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Drag Wire
		await page.locator("circle").nth(4).hover();
		await pointer.down();
		await pointer.moveTo(300, 300);
		await pointer.up();

		// Undo Wire
		await editor.undo();
		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);

		// Undo Move
		await expectPosToBe(editor.comp().nth(1), 100, 100);
		await editor.undo();
		await expectPosToBe(editor.comp().nth(1), 500, 500);

		// Undo Components
		await expect(editor.comp()).toHaveCount(2);
		await editor.undo();
		await expect(editor.comp()).toHaveCount(1);
		await editor.undo();
		await expect(editor.comp()).toHaveCount(0);

		// Undo while adding
		await editor.addComponent("AND", 100, 100); // Add component
		if (!hasTouch) {
			await page.keyboard.press("a"); // Start adding another component
			await page.keyboard.press("Control+KeyZ");
			await expect(editor.comp()).toHaveCount(1);
		}

		// Undo while moving
		await editor.comp().hover();
		await pointer.down();
		await pointer.moveTo(200, 200);
		await page.keyboard.press("Control+KeyZ");
		// Component should be back at 100, 100
		await expectPosToBe(editor.comp(), 100, 100);
	});

	test("delete flow", async ({ page, editor }) => {
		// Create first component
		await editor.addComponent("AND", 100, 100);

		// Drag wire from first component
		const sourceHandle = page.locator("circle.handle").nth(2); // Output handle
		await editor.dragTo(sourceHandle, 300, 300);
		await expect(page.locator(".wire")).toHaveCount(1);

		// Create second component
		await editor.addComponent("OR", 400, 400);
		await expect(editor.comp()).toHaveCount(2);

		// Connect wire from second to first component
		const secondSourceHandle = page.locator("circle.handle").nth(3); // Second component input
		const targetHandle = page.locator("circle.handle").nth(2); // First wire output (after other inputs have disappeared)
		await editor.drag(secondSourceHandle, targetHandle);
		await expect(page.locator(".wire")).toHaveCount(2);

		// Switch to delete mode
		await page.getByRole("button", { name: "Toggle Delete" }).click();
		await expect(page.getByText("Editing Mode: Delete")).toBeVisible();

		// Delete first wire and confirm
		const firstWire = page.locator(".wire").first();
		await firstWire.hover({ force: true }); // has pointer-events: none
		await expect(firstWire).toHaveAttribute(
			"stroke",
			"var(--component-delete-color)",
		);
		await firstWire.click({ force: true });
		await expect(page.locator(".wire")).toHaveCount(1);

		// Delete second component and confirm
		const secondComponent = editor.comp().nth(1);
		await secondComponent.hover();
		await expect(secondComponent).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);
		await secondComponent.click();
		await expect(editor.comp()).toHaveCount(1);
		await expect(page.locator("circle.handle")).toHaveCount(5); // 3 for first component, 2 for second wire

		// Undo component deletion and confirm
		await editor.undo();
		await expect(editor.comp()).toHaveCount(2);
		await expect(editor.comp().nth(1)).not.toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		// Undo wire deletion and confirm
		await editor.undo();
		await expect(page.locator(".wire")).toHaveCount(2);
		await expect(page.locator(".wire").first()).not.toHaveAttribute(
			"stroke",
			"var(--component-delete-color)",
		);
	});
	test("disable same handles", async ({ page, editor, pointer, hasTouch }) => {
		// Create components
		await editor.addComponent("AND", 200, 200);
		await editor.addComponent("OR", 600, 600);

		// drag two wires from output
		const outputHandle = page.locator("circle.handle").nth(2);
		await editor.dragTo(outputHandle, 400, 100);
		await editor.dragTo(outputHandle, 400, 300);
		await expect(page.locator("circle.handle")).toHaveCount(8); // 2 inputs + 1 output + 2 wire endpoints, + 3 from second component

		// click on output handle
		const thirdHandle = page.locator("circle.handle").nth(5);
		await thirdHandle.hover();
		await pointer.down();

		// verify that other outputs have disappeared
		await expect(page.locator("circle.handle")).toHaveCount(5);

		// escape (or undo if on mobile)
		if (hasTouch) {
			await pointer.up();
			await editor.undo();
		} else {
			await page.keyboard.press("Escape");
			await pointer.up();
		}

		// verify that outputs are back
		await expect(page.locator("circle.handle")).toHaveCount(8);

		// click on input handle (n = 0)
		const inputHandle = page.locator("circle.handle").first();
		await inputHandle.hover();
		await pointer.down();

		// verify that other inputs have disappeared
		await expect(page.locator("circle.handle")).toHaveCount(5);

		// release
		await pointer.up();

		// verify that inputs are back
		await expect(page.locator("circle.handle")).toHaveCount(8);
	});
	test("correctly disables component inputs for connected wire outputs", async ({
		page,
		pointer,
	}) => {
		await loadCircuit(circuits.multiconnected, page);
		let middleHandle = page.locator("circle.handle").nth(8);
		await middleHandle.hover();
		await pointer.down();
		await expect(page.locator("circle.handle")).toHaveCount(2);
		middleHandle = page.locator("circle.handle").first();
		const targetHandle = page.locator("circle.handle").nth(1);
		await targetHandle.hover();
		await pointer.up();
		await expect(page.locator("circle.handle")).toHaveCount(9);
	});
	test("can load while simulating", async ({ page, editor }) => {
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await loadCircuit(circuits.singleAnd, page);
		await expect(editor.comp()).toHaveCount(1);
	});
});

test.describe("sidebar actions", async () => {
	test("undo button is disabled when no actions to undo", async ({
		page,
		editor,
	}) => {
		await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
		await editor.addComponent("AND", 100, 100);
		await expect(page.getByRole("button", { name: "Undo" })).not.toBeDisabled();
		await editor.undo();
		await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
	});
	test("clear button clears the canvas", async ({ page, editor }) => {
		await editor.addComponent("AND", 100, 100);
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(editor.comp()).toHaveCount(0);

		// Test in simulation mode
		await editor.addComponent("AND", 100, 100);
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(editor.comp()).toHaveCount(0);
		await expect(page.getByText("Editing Mode: Simulate")).not.toBeVisible();
	});
});

test.describe("theme switcher", async () => {
	test("theme switcher switches themes", async ({ page }) => {
		const lightTheme = page.getByLabel("Light theme");
		const autoTheme = page.getByLabel("System");
		const darkTheme = page.getByLabel("Dark theme");

		await expect(autoTheme).toHaveClass(/selected/);

		await lightTheme.click();
		await expect(lightTheme).toHaveClass(/selected/);
		await expect(autoTheme).not.toHaveClass(/selected/);

		await expect(page.locator(".theme-host")).toHaveClass(/theme-light/);

		await darkTheme.click();
		await expect(darkTheme).toHaveClass(/selected/);

		await expect(page.locator(".theme-host")).toHaveClass(/theme-dark/);
	});
});

test.describe("adding dialog", async () => {
	test("can cancel adding component with button", async ({ page, editor }) => {
		await page.getByText("AND", { exact: true }).click();
		await expect(page.getByText("Adding component")).toBeVisible();

		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(editor.comp()).toHaveCount(0);
	});
});

test.describe("panning and zooming", () => {
	test("can pan and zoom", async ({ page, editor, pointer, hasTouch }) => {
		test.skip(hasTouch, "Can't use wheel on touch devices");
		await editor.addComponent("AND", 100, 100);

		await pointer.moveTo(500, 500);

		await pointer.down();
		await pointer.moveTo(600, 600);
		await pointer.up();

		await expectPosToBe(editor.comp(), 200, 200);

		// Zoom into component (component position stays the same)
		await pointer.moveTo(200, 200);
		await page.mouse.wheel(0, 1);
		await expectPosToBe(editor.comp(), 200, 200);

		// Zoom out, but not on component (component position does not stay the same)
		await pointer.moveTo(0, 0);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await expectPosToBe(editor.comp(), 280, 280);

		// Can't pan when adding component
		await page.keyboard.press("a");

		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);
		await pointer.up();

		// Component was placed instead of panning
		await expectPosToBe(editor.comp().nth(1), 600, 600);
	});
	test("zooming while adding component keeps component centered", async ({
		page,
		editor,
		pointer,
		hasTouch,
	}) => {
		test.skip(hasTouch, "Can't use wheel on touch devices");
		await pointer.moveTo(500, 500);
		await page.keyboard.press("a");

		// Move mouse back and forth rapidly while zooming
		for (let i = 0; i < 21; i++) {
			await pointer.moveTo(i % 2 == 0 ? 0 : 500, 0);
			await page.mouse.wheel(0, 1);
		}
		// Mouse is now at 0, 0

		// Check that compnent and mouse are still in sync
		await expectPosToBe(editor.comp(), 0, 0);
	});
	test("moves components correctly when zoomed in and panned", async ({
		page,
		editor,
		pointer,
		hasTouch,
	}) => {
		test.skip(hasTouch, "Can't use wheel on touch devices");
		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(0, 0);
		await pointer.up();

		for (let i = 0; i < 10; i++) {
			await page.mouse.wheel(0, 1);
		}

		await editor.addComponent("AND", 100, 200);

		await pointer.down();
		await pointer.moveTo(500, 50);
		await expectPosToBe(editor.comp(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comp(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comp(), 400, 300);
	});
	test("can pan and zoom while simulating", async ({
		page,
		editor,
		pointer,
	}) => {
		await editor.addComponent("AND", 100, 100);
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);
		await pointer.up();
		await expectPosToBe(editor.comp(), 200, 200);
	});
	test("right click does not pan", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 100, 100);
		await pointer.moveTo(500, 500);
		await pointer.down({ button: "right" });
		await pointer.moveTo(600, 600);
		await pointer.up();
		await expectPosToBe(editor.comp(), 100, 100);
	});
	test("releasing mouse on component does nothing", async ({
		page,
		editor,
		pointer,
		hasTouch,
	}) => {
		test.skip(hasTouch, "Can't press escape on touch devices");
		await editor.addComponent("AND", 100, 100);
		await pointer.down();
		await pointer.moveTo(500, 500);
		await page.keyboard.press("Escape");
		await expectPosToBe(editor.comp(), 100, 100);

		const svgContents = await page.locator(".canvasWrapper svg").innerHTML();

		await pointer.moveTo(100, 100);
		await pointer.up();
		await pointer.moveTo(500, 500);

		expect(await page.locator(".canvasWrapper svg").innerHTML()).toEqual(
			svgContents,
		);
	});
	test("can't add components while paning", async ({
		page,
		pointer,
		editor,
	}) => {
		test.skip(false, "Can't press keys on touch devices");
		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);
		await page.keyboard.press("a");
		await pointer.up();
		await expect(editor.comp()).toHaveCount(0);
	});
	test("simulation mode stays on while panning", async ({
		page,
		editor,
		pointer,
	}) => {
		await editor.addComponent("IN", 100, 100);
		const input = page.locator("circle.input");
		await input.click();
		// Component should be powered
		await expect(input).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);

		// Component should still be powered
		await expect(input).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await pointer.up();
	});
});

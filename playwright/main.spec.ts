import { expect } from "@playwright/test";
import { circuits } from "./circuits";
import {
	drag,
	dragHandle,
	expectPosToBe,
	getAttr,
	getAttrs,
	loadCircuit,
	test,
	undo,
} from "./common";

test.describe("editor", () => {
	test("has title", async ({ page }) => {
		await expect(page).toHaveTitle("SimpleLogic");
	});

	test("adds component at correct position", async ({ page, editor }) => {
		await editor.addComponent("AND", 100, 200);

		const component = page.locator(".component-body").first();
		await expect(component).toBeVisible();

		await expectPosToBe(component, 100, 200);
	});
	test("adds component and discards", async ({ page, hasTouch }) => {
		test.skip(hasTouch, "Can't press escape on touch devices");
		await page.getByText("AND", { exact: true }).click();

		await page.keyboard.press("Escape");
		await expect(page.locator(".component-body")).toHaveCount(0);
	});
	test("adds multiple components", async ({ page, editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.addComponent("OR", 200, 100);
		await editor.addComponent("AND", 200, 100);
		await editor.addComponent("OR", 100, 200);

		await expect(page.locator(".component-body").nth(0)).toBeVisible();
		await expect(page.locator(".component-body").nth(1)).toBeVisible();
		await expect(page.locator(".component-body").nth(2)).toBeVisible();
		await expect(page.locator(".component-body").nth(3)).toBeVisible();
	});
	test("toggles sidebar correctly", async ({ page }) => {
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
		await page.getByRole("button", { name: "▶" }).click();
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(0);
		await page.getByRole("button", { name: "▶" }).click();
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
	});

	test("moves components correctly", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		await pointer.down();
		await pointer.move(500, 50);
		await expectPosToBe(page.locator(".component-body"), 500, 50);

		await pointer.move(400, 300);
		await expectPosToBe(page.locator(".component-body"), 400, 300);
		await pointer.up();
		await pointer.move(100, 100);
		await expectPosToBe(page.locator(".component-body"), 400, 300);
	});
	test("moves component and discards", async ({ page }) => {
		await addComponent(page, "AND", 100, 200);
		await expect(page.locator(".component-body")).toBeVisible();

		const component = page.locator(".component-body");
		const [x1, y1] = await getAttrs(component, "x", "y");
		await page.keyboard.press("Escape");

		await expect(component).toHaveAttribute("x", x1);
		await expect(component).toHaveAttribute("y", y1);
	});
	test("snaps", async ({ page }) => {
		await addComponent(page, "AND", 100, 200);

		await page.mouse.down();
		await page.mouse.move(0, 0, { steps: 10 });
		const boundingBox1 = (await page.locator(".component-body").boundingBox())!;
		await page.mouse.move(5, 5, { steps: 10 });
		const boundingBox2 = (await page.locator(".component-body").boundingBox())!;
		expect(boundingBox1).toStrictEqual(boundingBox2);
	});
	test("drags and moves new wires", async ({ page }) => {
		await addComponent(page, "AND", 100, 200);

		// Click handle
		const originalHandle = page.locator("circle.handle").nth(2);
		await originalHandle.hover();
		await expect(originalHandle).toHaveAttribute("r", "10");
		await page.mouse.down();

		// Move handle
		const handle = page.locator("circle.handle").nth(2);
		await page.mouse.move(300, 300, { steps: 10 });
		await expectPosToBe(handle, 300, 300);
		await expect(page.locator(".wire").first()).toBeVisible();

		// Move handle
		await page.mouse.move(400, 400, { steps: 10 });
		await expectPosToBe(handle, 400, 400);

		// Release and move mouse
		await page.mouse.up();
		await page.mouse.move(200, 200, { steps: 10 });
		await expectPosToBe(page.locator("circle.handle").nth(3), 400, 400);
		await expect(page.locator("circle.handle")).toHaveCount(4);
	});
	test("drags new wire and discards", async ({ page }) => {
		await addComponent(page, "AND", 100, 200);
		await expect(page.locator(".component-body")).toBeVisible();

		const handle = page.locator("circle").nth(2);
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Drag Wire
		await handle.hover();
		await page.mouse.down();
		await page.mouse.move(300, 300);

		await page.keyboard.press("Escape");

		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);
	});
	test("drags wires with components", async ({ page }) => {
		await addComponent(page, "AND", 500, 500);

		const handle = page.locator("circle.handle").first();
		await handle.hover();
		await page.mouse.down();
		await page.mouse.move(100, 100);
		await page.mouse.up();

		const d1 = await getAttr(page.locator(".wire"), "d");
		await page.locator(".component-body").hover();
		await page.mouse.down();
		await page.mouse.move(200, 300);
		await page.mouse.up();
		await expect(page.locator(".wire")).not.toHaveAttribute("d", d1);
	});
	test("can connect multiple wires from component output", async ({ page }) => {
		await addComponent(page, "AND", 100, 300);

		const handle = page.locator("circle.handle").nth(2);
		await drag(handle, 300, 100, page, { expect: false });
		await drag(handle, 300, 500, page, { expect: false });

		await expect(page.locator(".wire")).toHaveCount(2);

		// Move component and check if wires move too
		const d1 = await getAttr(page.locator(".wire").nth(0), "d");
		const d2 = await getAttr(page.locator(".wire").nth(1), "d");

		await drag(page.locator(".component-body"), 100, 100, page);

		await expect(page.locator(".wire").nth(0)).not.toHaveAttribute("d", d1);
		await expect(page.locator(".wire").nth(1)).not.toHaveAttribute("d", d2);
	});
	test("undo", async ({ page }) => {
		// Add components
		await addComponent(page, "AND", 300, 300);
		await addComponent(page, "AND", 500, 500);

		// Move Component
		await page.locator(".component-body").nth(1).hover();
		await page.mouse.down();
		await page.mouse.move(100, 100);
		await page.mouse.up();

		const handle = page.locator("circle").nth(4);
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Drag Wire
		await page.locator("circle").nth(4).hover();
		await page.mouse.down();
		await page.mouse.move(300, 300);
		await page.mouse.up();

		// Undo Wire
		await undo(page);
		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);

		// Undo Move
		await expectPosToBe(page.locator(".component-body").nth(1), 100, 100);
		await undo(page);
		await expectPosToBe(page.locator(".component-body").nth(1), 500, 500);

		// Undo Components
		await expect(page.locator(".component-body")).toHaveCount(2);
		await undo(page);
		await expect(page.locator(".component-body")).toHaveCount(1);
		await undo(page);
		await expect(page.locator(".component-body")).toHaveCount(0);

		// Undo while adding
		await addComponent(page, "AND", 100, 100); // Add component
		await page.keyboard.press("a"); // Start adding another component
		await page.keyboard.press("Control+KeyZ");
		await expect(page.locator(".component-body")).toHaveCount(1);

		// Undo while moving
		await page.locator(".component-body").hover();
		await page.mouse.down();
		await page.mouse.move(200, 200);
		await page.keyboard.press("Control+KeyZ");
		// Component should be back at 100, 100
		await expectPosToBe(page.locator(".component-body"), 100, 100);
	});
	test("drags and connects wires flow", async ({ page }) => {
		// Setup: Add component
		await addComponent(page, "AND", 100, 100);

		// Setup: Drag wire
		let sourceHandle = page.locator("circle.handle").first();
		await drag(sourceHandle, 500, 500, page, { expect: false });

		// 1. Drag and release
		const wire = page.locator(".wire");
		const handle = page.locator("circle.handle").nth(2);
		await drag(handle, 400, 400, page);

		// 2. Drag but not release
		const initialD = await getAttr(wire, "d");
		await drag(handle, 150, 150, page, { mouseUp: false, expect: false });
		await expectPosToBe(page.locator("circle.handle").nth(1), 150, 150);
		await expect(wire).not.toHaveAttribute("d", initialD);

		// 3. Press escape
		await page.keyboard.press("Escape");
		await page.mouse.up();
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 3.5 Drag and connect
		await addComponent(page, "XOR", 300, 300);

		sourceHandle = page.locator("circle.handle").nth(1);
		const targetHandle = await page
			.locator("circle.handle")
			.nth(2)
			.elementHandle();
		expect(targetHandle).not.toBeNull();

		await dragHandle(sourceHandle, targetHandle!, page);

		await targetHandle!.dispose();

		await expect(page.locator(".wire").last()).toHaveAttribute(
			"d",
			"M121 81 L201 221",
		);
		await undo(page);
		await undo(page);

		// 4. Drag
		await drag(handle, 250, 250, page);

		// 5. Undo
		await undo(page);
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 6. Move component
		const component = page.locator(".component-body");
		await drag(component, 50, 50, page);
		await expectPosToBe(handle, 400, 400);
		await expect(wire).not.toHaveAttribute("d", initialD);

		// Undo
		await undo(page);
		await expectPosToBe(handle, 400, 400);
		await expect(wire).toHaveAttribute("d", initialD);

		// 7. Undo twice (should remove the wire)
		await undo(page);
		await undo(page);
		await expect(page.locator(".wire")).toHaveCount(0);
	});
	test("delete flow", async ({ page }) => {
		// Create first component
		await addComponent(page, "AND", 100, 100);

		// Drag wire from first component
		const sourceHandle = page.locator("circle.handle").nth(2); // Output handle
		await drag(sourceHandle, 300, 300, page, { expect: false });
		await expect(page.locator(".wire")).toHaveCount(1);

		// Create second component
		await addComponent(page, "OR", 400, 400);
		await expect(page.locator(".component-body")).toHaveCount(2);

		// Connect wire from second to first component
		const secondSourceHandle = page.locator("circle.handle").nth(3); // Second component input
		const targetHandle = page.locator("circle.handle").nth(2); // First wire output (after other inputs have disappeared)
		await dragHandle(secondSourceHandle, targetHandle, page);
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
		const secondComponent = page.locator(".component-body").nth(1);
		await secondComponent.hover();
		await expect(secondComponent).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);
		await secondComponent.click();
		await expect(page.locator(".component-body")).toHaveCount(1);
		await expect(page.locator("circle.handle")).toHaveCount(5); // 3 for first component, 2 for second wire

		// Undo component deletion and confirm
		await undo(page);
		await expect(page.locator(".component-body")).toHaveCount(2);
		await expect(page.locator(".component-body").nth(1)).not.toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		// Undo wire deletion and confirm
		await undo(page);
		await expect(page.locator(".wire")).toHaveCount(2);
		await expect(page.locator(".wire").first()).not.toHaveAttribute(
			"stroke",
			"var(--component-delete-color)",
		);
	});
	test("disable same handles", async ({ page }) => {
		// Create components
		await addComponent(page, "AND", 200, 200);
		await addComponent(page, "OR", 600, 600);

		// drag two wires from output
		const outputHandle = page.locator("circle.handle").nth(2);
		await drag(outputHandle, 400, 100, page, { expect: false });
		await drag(outputHandle, 400, 300, page, { expect: false });
		await expect(page.locator("circle.handle")).toHaveCount(8); // 2 inputs + 1 output + 2 wire endpoints, + 3 from second component

		// click on output handle
		const thirdHandle = page.locator("circle.handle").nth(5);
		await thirdHandle.hover();
		await page.mouse.down();

		// verify that other outputs have disappeared
		await expect(page.locator("circle.handle")).toHaveCount(5);

		// escape
		await page.keyboard.press("Escape");
		await page.mouse.up();

		// verify that outputs are back
		await expect(page.locator("circle.handle")).toHaveCount(8);

		// click on input handle (n = 0)
		const inputHandle = page.locator("circle.handle").first();
		await inputHandle.hover();
		await page.mouse.down();

		// verify that other inputs have disappeared
		await expect(page.locator("circle.handle")).toHaveCount(5);

		// release
		await page.mouse.up();

		// verify that inputs are back
		await expect(page.locator("circle.handle")).toHaveCount(8);
	});
	test("correctly disables component inputs for connected wire outputs", async ({
		page,
	}) => {
		await loadCircuit(circuits.multiconnected, page);
		let middleHandle = page.locator("circle.handle").nth(8);
		await middleHandle.hover();
		await page.mouse.down();
		await expect(page.locator("circle.handle")).toHaveCount(2);
		middleHandle = page.locator("circle.handle").first();
		const targetHandle = page.locator("circle.handle").nth(1);
		await targetHandle.hover();
		await page.mouse.up();
		await expect(page.locator("circle.handle")).toHaveCount(9);
	});
	test("can load while simulating", async ({ page }) => {
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await loadCircuit(circuits.singleAnd, page);
		await expect(page.locator(".component-body")).toHaveCount(1);
	});
	test("clear button clears the canvas", async ({ page }) => {
		await addComponent(page, "AND", 100, 100);
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(page.locator(".component-body")).toHaveCount(0);

		// Test in simulation mode
		await addComponent(page, "AND", 100, 100);
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(page.locator(".component-body")).toHaveCount(0);
		await expect(page.getByText("Editing Mode: Simulate")).not.toBeVisible();
	});
	test("undo button is disabled when no actions to undo", async ({ page }) => {
		await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
		await addComponent(page, "AND", 100, 100);
		await expect(page.getByRole("button", { name: "Undo" })).not.toBeDisabled();
		await undo(page);
		await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
	});
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
	test("can cancel adding component with button", async ({ page }) => {
		await page.getByText("AND", { exact: true }).click();
		await expect(page.getByText("Adding component")).toBeVisible();

		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator(".component-body")).toHaveCount(0);
	});
});

test.describe("panning and zooming", () => {
	test("can pan and zoom", async ({ page }) => {
		await addComponent(page, "AND", 100, 100);

		await page.mouse.move(500, 500);

		await page.mouse.down();
		await page.mouse.move(600, 600);
		await page.mouse.up();

		await expectPosToBe(page.locator(".component-body"), 200, 200);

		// Zoom into component (component position stays the same)
		await page.mouse.move(200, 200);
		await page.mouse.wheel(0, 1);
		await expectPosToBe(page.locator(".component-body"), 200, 200);

		// Zoom out, but not on component (component position does not stay the same)
		await page.mouse.move(0, 0);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await expectPosToBe(page.locator(".component-body"), 280, 280);

		// Can't pan when adding component
		await page.keyboard.press("a");

		await page.mouse.move(500, 500);
		await page.mouse.down();
		await page.mouse.move(600, 600);
		await page.mouse.up();

		// Component was placed instead of panning
		await expectPosToBe(page.locator(".component-body").nth(1), 600, 600);
	});
	test("zooming while adding component keeps component centered", async ({
		page,
	}) => {
		await page.mouse.move(500, 500);
		await page.keyboard.press("a");

		// Move mouse back and forth rapidly while zooming
		for (let i = 0; i < 21; i++) {
			await page.mouse.move(i % 2 == 0 ? 0 : 500, 0);
			await page.mouse.wheel(0, 1);
		}
		// Mouse is now at 0, 0

		// Check that compnent and mouse are still in sync
		await expectPosToBe(page.locator(".component-body"), 0, 0);
	});
	test("moves components correctly when zoomed in and panned", async ({
		page,
	}) => {
		await page.mouse.move(500, 500);
		await page.mouse.down();
		await page.mouse.move(0, 0);
		await page.mouse.up();

		for (let i = 0; i < 10; i++) {
			await page.mouse.wheel(0, 1);
		}

		await addComponent(page, "AND", 100, 200);

		await page.mouse.down();
		await page.mouse.move(500, 50, { steps: 10 });
		await expectPosToBe(page.locator(".component-body"), 500, 50);

		await page.mouse.move(400, 300, { steps: 10 });
		await expectPosToBe(page.locator(".component-body"), 400, 300);
		await page.mouse.up();
		await page.mouse.move(100, 100, { steps: 10 });
		await expectPosToBe(page.locator(".component-body"), 400, 300);
	});
	test("can pan and zoom while simulating", async ({ page }) => {
		await addComponent(page, "AND", 100, 100);
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await page.mouse.move(500, 500);
		await page.mouse.down();
		await page.mouse.move(600, 600);
		await page.mouse.up();
		await expectPosToBe(page.locator(".component-body"), 200, 200);
	});
	test("right click does not pan", async ({ page }) => {
		await addComponent(page, "AND", 100, 100);
		await page.mouse.move(500, 500);
		await page.mouse.down({ button: "right" });
		await page.mouse.move(600, 600);
		await page.mouse.up();
		await expectPosToBe(page.locator(".component-body"), 100, 100);
	});
	test("releasing mouse on component does nothing", async ({ page }) => {
		await addComponent(page, "AND", 100, 100);
		await page.mouse.down();
		await page.mouse.move(500, 500);
		await page.keyboard.press("Escape");
		await expectPosToBe(page.locator(".component-body"), 100, 100);

		const svgContents = await page.locator(".canvasWrapper svg").innerHTML();

		await page.mouse.move(100, 100);
		await page.mouse.up();
		await page.mouse.move(500, 500);

		expect(await page.locator(".canvasWrapper svg").innerHTML()).toEqual(
			svgContents,
		);
	});
	test("can't add components while paning", async ({ page }) => {
		await page.mouse.move(500, 500);
		await page.mouse.down();
		await page.mouse.move(600, 600);
		await page.keyboard.press("a");
		await page.mouse.up();
		await expect(page.locator(".component-body")).toHaveCount(0);
	});
	test("simulation mode stays on while panning", async ({ page }) => {
		await addComponent(page, "IN", 100, 100);
		const input = page.locator("circle.input");
		await input.click();
		// Component should be powered
		await expect(input).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await page.mouse.move(500, 500);
		await page.mouse.down();
		await page.mouse.move(600, 600);

		// Component should still be powered
		await expect(input).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		await page.mouse.up();
	});
});

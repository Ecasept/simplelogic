import { circuits } from "./circuits";
import { expect, expectPosToBe, getAttr, getAttrs, test } from "./common";

test.describe("adding and dragging/moving", async () => {
	test("adds component at correct position", async ({ editor }) => {
		await editor.addComponent("AND", 100, 200);

		const component = editor.comps().first();
		await expect(component).toBeVisible();

		await expectPosToBe(component, 100, 200);
	});
	test("adds component and discards", async ({ page, editor }) => {
		await editor.initiateAddComponent("AND");

		await page.keyboard.press("Escape");
		await expect(editor.comps()).toHaveCount(0);
	});
	test("adds multiple components", async ({ editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.addComponent("OR", 200, 100);
		await editor.addComponent("AND", 200, 100);
		await editor.addComponent("OR", 100, 200);

		await expect(editor.comps().first()).toBeVisible();
		await expect(editor.comps().nth(1)).toBeVisible();
		await expect(editor.comps().nth(2)).toBeVisible();
		await expect(editor.comps().nth(3)).toBeVisible();
	});

	test("drags and moves new wires", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		// Click handle
		const originalHandle = editor.handles().nth(2);
		await originalHandle.hover();
		await expect(originalHandle).toHaveAttribute("r", "10");
		await pointer.down();

		// Move handle
		const handle = editor.handles().nth(2);
		await pointer.moveTo(300, 300);
		await expectPosToBe(handle, 300, 300);
		await expect(page.locator(".wire").first()).toBeVisible();

		// Move handle
		await pointer.moveTo(400, 400);
		await expectPosToBe(handle, 400, 400);

		// Release and move mouse
		await pointer.up();
		await pointer.moveTo(200, 200);
		await expectPosToBe(editor.handles().nth(3), 400, 400);
		await expect(editor.handles()).toHaveCount(4);
	});
	test("drags new wire and discards", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);
		await expect(editor.comps()).toBeVisible();

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

		const handle = editor.handles().first();
		await handle.hover();
		await pointer.down();
		await pointer.moveTo(100, 100);
		await pointer.up();

		const d1 = await getAttr(page.locator(".wire"), "d");
		await editor.comps().hover();
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
		let sourceHandle = editor.handles().first();
		await editor.dragTo(sourceHandle, 500, 500);

		// 1. Drag and release
		const wire = page.locator(".wire");
		const handle = editor.handles().nth(2);
		await editor.dragTo(handle, 400, 400);

		// 2. Drag but not release
		const initialD = await getAttr(wire, "d");
		await pointer.downOn(handle);
		await pointer.moveTo(150, 150);
		await expectPosToBe(editor.handles().nth(1), 150, 150);
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
		const component = editor.comps();
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
		await expectPosToBe(editor.comps(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comps(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comps(), 400, 300);
	});
	test("moves component and discards", async ({ page, editor }) => {
		await editor.addComponent("AND", 100, 200);
		await expect(editor.comps()).toBeVisible();

		const component = editor.comps();
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

		const handle = editor.handles().nth(2);
		await editor.dragTo(handle, 300, 100);
		await editor.dragTo(handle, 300, 500);

		await expect(page.locator(".wire")).toHaveCount(2);

		// Move component and check if wires move too
		const d1 = await getAttr(page.locator(".wire").nth(0), "d");
		const d2 = await getAttr(page.locator(".wire").nth(1), "d");

		await editor.dragTo(editor.comps(), 100, 100);
		await expectPosToBe(editor.comps(), 100, 100);

		await expect(page.locator(".wire").nth(0)).not.toHaveAttribute("d", d1);
		await expect(page.locator(".wire").nth(1)).not.toHaveAttribute("d", d2);
	});
	test("doesn't connect wire when under component", async ({ editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.addComponent("AND", 150, 120);
		await editor.drag(
			editor.getHandle("AND", "in1").first(),
			editor.getHandle("AND", "out").first(),
			true,
		);

		// Verify that the created wire is not connected
		// Move second component off the first
		await editor.dragTo(editor.getComponent("AND").nth(1), 200, 200);
		// Move the first component away
		await editor.dragTo(editor.getComponent("AND").first(), 300, 300);
		// Expect wire to not have moved
		await expect(editor.wires()).toHaveAttribute("d", "M121 81 L201 221");
	});
	test("can add wire from wire with shift", async ({
		editor,
		pointer,
		page,
	}) => {
		await editor.loadCircuit(circuits.multiconnected);

		await page.keyboard.down("Shift");
		await pointer.downOn(editor.getHandle("wire", "output").nth(3));

		await pointer.moveOnto(editor.getHandle("wire", "input").nth(4));

		await pointer.up();

		await expect(editor.wires()).toHaveCount(6);
	});
});

test.describe("deleting", async () => {
	test("deletes wire on top of component", async ({ editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in2").first(),
		);
		await editor.deleteWire(editor.wires().first());

		await expect(editor.wires()).toHaveCount(1);
		await expect(editor.comps()).toHaveCount(1);
	});
	test("delete flow", async ({ page, editor }) => {
		// Create first component
		await editor.addComponent("AND", 100, 100);

		// Drag wire from first component
		const sourceHandle = editor.handles().nth(2); // Output handle
		await editor.dragTo(sourceHandle, 300, 300);
		await expect(page.locator(".wire")).toHaveCount(1);

		// Create second component
		await editor.addComponent("OR", 400, 400);
		await expect(editor.comps()).toHaveCount(2);

		// Connect wire from second to first component
		const secondSourceHandle = editor.handles().nth(3); // Second component input
		const targetHandle = editor.handles().nth(2); // First wire output (after other inputs have disappeared)
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
		const secondComponent = editor.comps().nth(1);
		await secondComponent.hover();
		await expect(secondComponent).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);
		await secondComponent.click();
		await expect(editor.comps()).toHaveCount(1);
		await expect(editor.handles()).toHaveCount(5); // 3 for first component, 2 for second wire

		// Undo component deletion and confirm
		await editor.undo();
		await expect(editor.comps()).toHaveCount(2);
		await expect(editor.comps().nth(1)).not.toHaveAttribute(
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
	test("delete wire with handle", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.dragTo(editor.getHandle("AND", "out").first(), 200, 200);

		await editor.toggleDelete();

		await pointer.clickOn(editor.getHandle("wire", "output").first());

		await expect(editor.wires()).toHaveCount(0);
	});
});

test.describe("other", () => {
	test("has title", async ({ page }) => {
		await expect(page).toHaveTitle("SimpleLogic");
	});

	test("snaps", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);

		await pointer.downAt(100, 200);
		await pointer.moveTo(20, 20);
		const boundingBox1 = (await editor.comps().boundingBox())!;
		await pointer.moveTo(15, 15);
		const boundingBox2 = (await editor.comps().boundingBox())!;
		expect(boundingBox1).toStrictEqual(boundingBox2);
	});

	test("undo", async ({ page, editor, pointer, hasTouch }) => {
		// Add components
		await editor.addComponent("AND", 300, 300);
		await editor.addComponent("AND", 500, 500);

		// Move Component
		await editor.comps().nth(1).hover();
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
		await expectPosToBe(editor.comps().nth(1), 100, 100);
		await editor.undo();
		await expectPosToBe(editor.comps().nth(1), 500, 500);

		// Undo Components
		await expect(editor.comps()).toHaveCount(2);
		await editor.undo();
		await expect(editor.comps()).toHaveCount(1);
		await editor.undo();
		await expect(editor.comps()).toHaveCount(0);

		// Undo while adding
		await editor.addComponent("AND", 100, 100); // Add component
		if (!hasTouch) {
			await page.keyboard.press("a"); // Start adding another component
			await page.keyboard.press("Control+KeyZ");
			await expect(editor.comps()).toHaveCount(1);
		}

		// Undo while moving
		await editor.comps().hover();
		await pointer.down();
		await pointer.moveTo(200, 200);
		await page.keyboard.press("Control+KeyZ");
		// Component should be back at 100, 100
		await expectPosToBe(editor.comps(), 100, 100);
	});

	test("disable same handles", async ({ page, editor, pointer, hasTouch }) => {
		// Create components
		await editor.addComponent("AND", 200, 200);
		await editor.addComponent("OR", 600, 600);

		// drag two wires from output
		const outputHandle = editor.handles().nth(2);
		await editor.dragTo(outputHandle, 400, 100);
		await editor.dragTo(outputHandle, 400, 300);
		await expect(editor.handles()).toHaveCount(8); // 2 inputs + 1 output + 2 wire endpoints, + 3 from second component

		// click on output handle
		const thirdHandle = editor.handles().nth(5);
		await thirdHandle.hover();
		await pointer.down();

		// verify that other outputs have disappeared
		await expect(editor.handles()).toHaveCount(5);

		// escape (or undo if on mobile)
		if (hasTouch) {
			await pointer.up();
			await editor.undo();
		} else {
			await page.keyboard.press("Escape");
			await pointer.up();
		}

		// verify that outputs are back
		await expect(editor.handles()).toHaveCount(8);

		// click on input handle (n = 0)
		const inputHandle = editor.handles().first();
		await inputHandle.hover();
		await pointer.down();

		// verify that other inputs have disappeared
		await expect(editor.handles()).toHaveCount(5);

		// release
		await pointer.up();

		// verify that inputs are back
		await expect(editor.handles()).toHaveCount(8);
	});
	test("correctly disables component inputs for connected wire outputs", async ({
		page,
		pointer,
		editor,
	}) => {
		await editor.loadCircuit(circuits.multiconnected);
		let middleHandle = editor.handles().nth(8);
		await middleHandle.hover();
		await pointer.down();
		await expect(editor.handles()).toHaveCount(2);
		middleHandle = editor.handles().first();
		const targetHandle = editor.handles().nth(1);
		await targetHandle.hover();
		await pointer.up();
		await expect(editor.handles()).toHaveCount(9);
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
		await expect(editor.comps()).toHaveCount(0);

		// Test in simulation mode
		await editor.addComponent("AND", 100, 100);
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(editor.comps()).toHaveCount(0);
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

test.describe("cancel button", async () => {
	test("can cancel adding component by dragging on to cancel button", async ({
		page,
		editor,
		pointer,
	}) => {
		await editor.initiateAddComponent("AND");
		await expect(page.getByText("Cancel")).toBeVisible();

		await pointer.moveOnto(page.getByText("Cancel"), true);
		await pointer.up();
		await expect(editor.comps()).toHaveCount(0);
	});
	test("can cancel adding component by clicking on cancel button", async ({
		page,
		editor,
		pointer,
	}) => {
		await page.keyboard.press("a");
		await expect(page.getByText("Cancel")).toBeVisible();

		await pointer.clickOn(page.getByText("Cancel"), true);

		await expect(editor.comps()).toHaveCount(0);
	});
});

test.describe("panning and zooming", () => {
	test("can pan and zoom", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 100, 100);

		await pointer.moveTo(500, 500);

		await pointer.down();
		await pointer.moveTo(600, 600);
		await pointer.up();

		await expectPosToBe(editor.comps(), 200, 200);

		// Zoom into component (component position stays the same)
		await pointer.moveTo(200, 200);
		await page.mouse.wheel(0, 1);
		await expectPosToBe(editor.comps(), 200, 200);

		// Zoom out, but not on component (component position does not stay the same)
		await pointer.moveTo(0, 0);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await page.mouse.wheel(0, -1);
		await expectPosToBe(editor.comps(), 280, 280);

		// Can't pan when adding component
		await page.keyboard.press("a");

		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);
		await pointer.up();

		// Component was placed instead of panning
		await expectPosToBe(editor.comps().nth(1), 600, 600);
	});
	test("zooming while adding component keeps component centered", async ({
		page,
		editor,
		pointer,
	}) => {
		await pointer.moveTo(500, 500);
		await page.keyboard.press("a");

		// Move mouse back and forth rapidly while zooming
		for (let i = 0; i < 21; i++) {
			await pointer.moveTo(i % 2 == 0 ? 0 : 500, 0);
			await page.mouse.wheel(0, 1);
		}
		// Mouse is now at 0, 0

		// Check that compnent and mouse are still in sync
		await expectPosToBe(editor.comps(), 0, 0);
	});
	test("moves components correctly when zoomed in and panned", async ({
		page,
		editor,
		pointer,
	}) => {
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
		await expectPosToBe(editor.comps(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comps(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comps(), 400, 300);
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
		await expectPosToBe(editor.comps(), 200, 200);
	});
	test("right click does not pan", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 100, 100);
		await pointer.moveTo(500, 500);
		await pointer.down({ button: "right" });
		await pointer.moveTo(600, 600);
		await pointer.up();
		await expectPosToBe(editor.comps(), 100, 100);
	});
	test("releasing mouse on component does nothing", async ({
		page,
		editor,
		pointer,
	}) => {
		await editor.addComponent("AND", 100, 100);
		await pointer.down();
		await pointer.moveTo(500, 500);
		await page.keyboard.press("Escape");
		await expectPosToBe(editor.comps(), 100, 100);

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
		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);
		await page.keyboard.press("a");
		await pointer.up();
		await expect(editor.comps()).toHaveCount(0);
	});
	test("simulation mode stays on while panning", async ({
		page,
		editor,
		pointer,
	}) => {
		await editor.addComponent("IN", 100, 100);
		const input = editor.getHandle("IN", "out").first();
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

test.describe("simulating", () => {
	test("can load while simulating", async ({ page, editor }) => {
		await page.getByRole("button", { name: "Toggle Simulation" }).click();
		await editor.loadCircuit(circuits.singleAnd);
		await expect(editor.comps()).toHaveCount(1);
	});
	test("build half adder flow", async ({ editor, pointer }) => {
		// Add inputs
		await editor.addComponent("IN", 100, 100);
		await editor.addComponent("IN", 100, 200);

		// Add XOR gate for sum
		await editor.addComponent("XOR", 200, 150);

		// Add AND gate for carry
		await editor.addComponent("AND", 200, 250);

		// Add LED gates for outputs
		await editor.addComponent("LED", 300, 150); // Sum output
		await editor.addComponent("LED", 300, 250); // Carry output

		// Connect inputs to XOR gate
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("XOR", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("XOR", "in2").first(),
		);

		// Connect inputs to AND gate
		await editor.drag(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("AND", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("AND", "in2").first(),
		);

		// Connect XOR output to LED (sum)
		await editor.drag(
			editor.getHandle("XOR", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		// Connect AND output to LED (carry)
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("LED", "in").nth(1),
		);

		await editor.toggleSimulate();

		const in1 = editor.getComponent("IN").first();
		const in2 = editor.getComponent("IN").nth(1);
		const sum = editor.getComponent("LED").first();
		const carry = editor.getComponent("LED").nth(1);

		// Test case 1: in1 = 1, in2 = 0
		await pointer.clickOn(in1, true);
		await expect(in1).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum).toBePowered();

		// Test case 2: in1 = 1, in2 = 1
		await pointer.clickOn(in2, true);
		await expect(in2).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum).not.toBePowered();
		await expect(carry).toBePowered();

		// Test case 3: in1 = 0, in2 = 1
		await pointer.clickOn(in1, true);
		await expect(in1).not.toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum).toBePowered();
		await expect(carry).not.toBePowered();

		// Test case 4: in1 = 0, in2 = 0
		await pointer.clickOn(in2, true);
		await expect(in2).not.toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum).not.toBePowered();
		await expect(carry).not.toBePowered();
	});

	test("simulate 2-bit ripple carry adder", async ({ editor, pointer }) => {
		await editor.loadCircuit(circuits.rippleCarryAdder);

		const b1 = editor.getComponent("IN").first(); // first bit of second number
		const b2 = editor.getComponent("IN").nth(1); // second bit of second number
		const a1 = editor.getComponent("IN").nth(2); // first bit of first number
		const a2 = editor.getComponent("IN").nth(3); // second bit of first number
		const sum2 = editor.getComponent("LED").first(); // second bit of solution
		const sum3 = editor.getComponent("LED").nth(1); // third bit of solution
		const sum1 = editor.getComponent("LED").nth(2); // first bit of solution

		await editor.toggleSimulate();
		await editor.waitForSimulationFinished(); // Initial simulation state

		// Test case 1: 001 (A1 = 1)
		await pointer.clickOn(a1, true);
		await expect(a1).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum1).toBePowered();

		// Test case 2: 011 (A1 = 1, A2 = 1)
		await pointer.clickOn(a2, true);
		await expect(a2).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum2).toBePowered();
		await expect(sum1).toBePowered();

		// Test case 3: 100 (A1 = 1, A2 = 1, B1 = 1)
		await pointer.clickOn(b1, true);
		await expect(b1).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum1).not.toBePowered();
		await expect(sum2).not.toBePowered();
		await expect(sum3).toBePowered();

		// Test case 4: 110 (All inputs = 1)
		await pointer.clickOn(b2, true);
		await expect(b2).toBePowered();
		await editor.waitForSimulationFinished();
		await expect(sum1).not.toBePowered();
		await expect(sum2).toBePowered();
		await expect(sum3).toBePowered();

		// Reset all inputs (with checks + waits)
		await pointer.clickOn(a1, true);
		await expect(a1).not.toBePowered();
		await editor.waitForSimulationFinished();

		await pointer.clickOn(a2, true);
		await expect(a2).not.toBePowered();
		await editor.waitForSimulationFinished();

		await pointer.clickOn(b1, true);
		await expect(b1).not.toBePowered();
		await editor.waitForSimulationFinished();

		await pointer.clickOn(b2, true);
		await expect(b2).not.toBePowered();
		await editor.waitForSimulationFinished();

		// Test case 5: 100 (A2 = 1, B2 = 1)
		await pointer.clickOn(a2, true);
		await expect(a2).toBePowered();
		await editor.waitForSimulationFinished();

		await pointer.clickOn(b2, true);
		await expect(b2).toBePowered();
		await editor.waitForSimulationFinished();

		await expect(sum1).not.toBePowered();
		await expect(sum2).not.toBePowered();
		await expect(sum3).toBePowered();
	});

	test("simulate SR NOR latch", async ({ editor, pointer }) => {
		await editor.loadCircuit(circuits.SR_NOR_latch);

		const r = editor.getComponent("IN").first(); // reset
		const s = editor.getComponent("IN").nth(1); // set
		const qnot = editor.getComponent("LED").first(); // inverted result (Q̅)
		const q = editor.getComponent("LED").nth(1); // result (Q)

		await editor.toggleSimulate();
		await editor.waitForSimulationFinished(); // Initial state stabilization

		// Initial state: R = 1, S = 0, Q = 0, Q̅ = 1
		await expect(r).toBePowered(); // R = 1
		await expect(s).not.toBePowered(); // S = 0
		await expect(q).not.toBePowered(); // Q = 0
		await expect(qnot).toBePowered(); // Q̅ = 1

		// Toggle R (Reset) to 0
		await pointer.clickOn(r, true); // Toggle R to 0
		await expect(r).not.toBePowered(); // R = 0
		await editor.waitForSimulationFinished();
		await expect(s).not.toBePowered(); // S remains 0
		await expect(q).not.toBePowered(); // Q remains 0 (no change)
		await expect(qnot).toBePowered(); // Q̅ remains 1 (no change)

		// Toggle S (Set) to 1
		await pointer.clickOn(s, true); // Toggle S to 1
		await expect(s).toBePowered(); // S = 1
		await editor.waitForSimulationFinished();
		await expect(r).not.toBePowered(); // R remains 0
		await expect(q).toBePowered(); // Q = 1
		await expect(qnot).not.toBePowered(); // Q̅ = 0

		// Toggle S (Set) to 0
		await pointer.clickOn(s, true); // Toggle S to 0
		await expect(s).not.toBePowered(); // S = 0
		await editor.waitForSimulationFinished();
		await expect(r).not.toBePowered(); // R remains 0
		await expect(q).toBePowered(); // Q remains 1 (no change)
		await expect(qnot).not.toBePowered(); // Q̅ remains 0 (no change)

		// Toggle R (Reset) to 1
		await pointer.clickOn(r, true); // Toggle R to 1
		await expect(r).toBePowered(); // R = 1
		await editor.waitForSimulationFinished();
		await expect(s).not.toBePowered(); // S remains 0
		await expect(q).not.toBePowered(); // Q = 0
		await expect(qnot).toBePowered(); // Q̅ = 1

		// Toggle S (Set) to 1 (invalid state)
		await pointer.clickOn(s, true); // Toggle S to 1
		await expect(s).toBePowered(); // S = 1
		await editor.waitForSimulationFinished();
		await expect(r).toBePowered(); // R remains 1
		await expect(q).not.toBePowered(); // Q is 0 (invalid state)
		await expect(qnot).not.toBePowered(); // Q̅ is 0 (invalid state)
		// invalid state because: Q = Q̅, which is by definition not possible

		// Toggle R (Reset) to 0
		await pointer.clickOn(r, true); // Toggle R to 0
		await expect(r).not.toBePowered(); // R = 0
		await editor.waitForSimulationFinished();
		await expect(s).toBePowered(); // S remains 1
		await expect(q).toBePowered(); // Q = 1
		await expect(qnot).not.toBePowered(); // Q̅ = 0
	});
});

test.describe("sidebar", () => {
	test("toggles sidebar correctly", async ({ page, editor }) => {
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
		await editor.toggleSidebar();
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(0);
		await editor.toggleSidebar();
		await expect(page.locator(".sidebarWrapper.open")).toHaveCount(1);
	});
	test("toggles component toolbar correctly", async ({ page, editor }) => {
		await expect(page.locator(".buttons-container")).toBeVisible();
		await editor.toggleComponentToolbar();
		await expect(page.locator(".buttons-container")).not.toBeVisible();
		await editor.toggleComponentToolbar();
		await expect(page.locator(".buttons-container")).toBeVisible();
	});
});

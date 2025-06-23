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

	test("drags and moves new wires", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 300, 300);

		// Click handle
		const originalHandle = editor.getHandle("AND", "out").first();
		await originalHandle.hover();
		await expect(originalHandle).toHaveAttribute("r", "10");
		await pointer.down();

		// Move handle
		await pointer.moveTo(500, 400);
		const handle = editor.getHandle("wire", "output").first();
		await expect(handle).toBeAt(500, 400);
		await expect(editor.wires().first()).toBeVisible();

		// Move handle
		await pointer.moveTo(600, 500);
		await expect(handle).toBeAt(600, 500);

		// Release and move mouse
		await pointer.up();
		await pointer.moveTo(400, 300);
		await expect(handle).toBeAt(600, 500);
		await expect(editor.handles()).toHaveCount(4);
	});
	test("drags new wire and discards", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 300, 300);
		await expect(editor.comps()).toBeVisible();

		const handle = editor.getHandle("AND", "out").first();
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Drag Wire
		await handle.hover();
		await pointer.down();
		await pointer.moveTo(500, 400);

		await page.keyboard.press("Escape");

		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);
	});
	test("drags wires with components", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 500, 500);

		const handle = editor.handles().first();
		await handle.hover();
		await pointer.down();
		await pointer.moveTo(100, 100);
		await pointer.up();

		const d1 = await getAttr(editor.wires(), "d");
		await editor.comps().hover();
		await pointer.down();
		await pointer.moveTo(200, 300);
		await pointer.up();
		await expect(editor.wires()).not.toHaveAttribute("d", d1);
	});
	test("drags and connects wires flow", async ({
		page,
		editor,
		pointer,
		hasTouch,
	}) => {
		// Setup: Add component
		await editor.addComponent("AND", 500, 400);

		// Setup: Drag a wire
		let sourceHandle = editor.getHandle("AND", "in1").first();
		await editor.dragTo(sourceHandle, 500, 500);

		// 1. Drag a new wire and release
		let handle = editor.getHandle("AND", "out").first();
		await editor.dragTo(handle, 400, 400);

		// 2. Drag that wire again but don't release
		const wire = editor.wires().nth(1);
		handle = editor.getHandle("wire", "output").nth(1);
		const initialD = await getAttr(wire, "d");
		await pointer.downOn(handle);
		await pointer.moveTo(150, 150);
		await expect(handle).toBeAt(150, 150);
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
		await editor.addComponent("XOR", 500, 300);

		sourceHandle = editor.getHandle("AND", "out").first();
		const targetHandle = editor.getHandle("XOR", "in1").first();
		await editor.drag(sourceHandle, targetHandle);

		await expect(editor.wires().last()).toHaveAttribute(
			"d",
			"M440 320 L360 220",
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
		await expect(editor.wires()).toHaveCount(0);
	});
	test("moves components correctly", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 400, 200);

		await pointer.down();
		await pointer.moveTo(500, 50);
		await expectPosToBe(editor.comps(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comps(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comps(), 400, 300);
	});
	test("moves component and discards", async ({ page, editor, pointer }) => {
		await editor.addComponent("AND", 500, 200);
		await expect(editor.comps()).toBeVisible();

		const component = editor.comps();
		const [x1, y1] = await getAttrs(component, "x", "y");

		await pointer.clickOn(component, true);
		await pointer.moveTo(300, 300);
		await page.keyboard.press("Escape");

		await expect(component).toHaveAttribute("x", x1);
		await expect(component).toHaveAttribute("y", y1);
	});
	test("can connect multiple wires from component output, and delete it", async ({
		page,
		editor,
	}) => {
		await editor.addComponent("AND", 400, 300);

		const handle = editor.getHandle("AND", "out").first();
		await editor.dragTo(handle, 300, 100);
		await editor.dragTo(handle, 300, 500);

		await expect(editor.wires()).toHaveCount(2);

		// Move component and check if wires move too
		const d1 = await getAttr(editor.wires().nth(0), "d");
		const d2 = await getAttr(editor.wires().nth(1), "d");

		await editor.dragTo(editor.comps(), 500, 500);
		await expectPosToBe(editor.comps(), 500, 500);

		await expect(editor.wires().nth(0)).not.toHaveAttribute("d", d1);
		await expect(editor.wires().nth(1)).not.toHaveAttribute("d", d2);

		await editor.deleteSelected();

		// Move wire to check that they are disconnected
		await editor.dragTo(
			editor.getHandle("wire", "input").first(),
			200,
			200,
			true,
		);

		// Expect correct d attributes for the wires after moving
		await expect(editor.wires().nth(0)).toHaveAttribute(
			"d",
			"M440 400 L240 80",
		);
		await expect(editor.wires().nth(1)).toHaveAttribute(
			"d",
			"M160 160 L240 400",
		);
	});
	test("doesn't connect wire when under component", async ({ editor }) => {
		await editor.addComponent("AND", 100, 150);
		await editor.addComponent("AND", 150, 120);
		await editor.toggleSidebar("tools");
		await editor.drag(
			editor.getHandle("AND", "in2").first(),
			editor.getHandle("AND", "out").first(),
			true,
		);

		// Verify that the created wire is not connected
		// Move second component off the first
		await editor.dragTo(editor.getComponent("AND").nth(1), 200, 200);
		// Move the first component away
		await editor.dragTo(editor.getComponent("AND").first(), 300, 300);
		// Expect wire to not have moved
		await expect(editor.wires()).toHaveAttribute("d", "M120 120 L200 260");
	});
	test("can add wire from wire with shift", async ({
		editor,
		pointer,
		page,
	}) => {
		await editor.loadCircuitUsingClipboard(circuits.multiconnected);

		await page.keyboard.down("Shift");
		await pointer.downOn(editor.getHandle("wire", "output").nth(3));

		await pointer.moveOnto(editor.getHandle("wire", "input").nth(4));

		await pointer.up();

		await expect(editor.wires()).toHaveCount(6);
	});
	test("clicking but not dragging a component does not add a history entry", async ({
		editor,
		pointer,
	}) => {
		await editor.addComponent("AND", 500, 100);
		await pointer.clickOn(editor.comps(), true);
		// Expect component to not have moved
		await expectPosToBe(editor.comps(), 500, 100);
		await editor.undo();
		// Expect the component addition to be undone, instead of any move
		await expect(editor.comps()).toHaveCount(0);
	});
	test("clicking but not dragging a wire handle does not add a history entry", async ({
		editor,
		pointer,
	}) => {
		await editor.addComponent("AND", 500, 100);
		await editor.dragTo(editor.getHandle("AND", "out").first(), 500, 200);
		await pointer.clickOn(editor.getHandle("wire", "output").first());
		// Expect wire to not have moved
		await expect(editor.wires()).toHaveCount(1);
		await editor.undo();
		// Expect the wire addition to be undone, instead of any move
		await expect(editor.wires()).toHaveCount(0);
	});
});
test.describe("deleting", async () => {
	test("can't delete wire under component", async ({ editor }) => {
		await editor.addComponent("AND", 500, 100);
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in1").first(),
		);
		await editor.drag(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in2").first(),
		);
		await editor.deleteWire(editor.wires().first());

		await expect(editor.wires()).toHaveCount(2); // Both wires should still exist
		await expect(editor.comps()).toHaveCount(0); // Component should have been deleted
	});
	test("delete flow", async ({ editor }) => {
		// Create first component
		await editor.addComponent("AND", 500, 100);

		// Drag wire from first component
		const sourceHandle = editor.handles().nth(2); // Output handle
		await editor.dragTo(sourceHandle, 300, 300);
		await expect(editor.wires()).toHaveCount(1);

		// Create second component
		await editor.addComponent("OR", 400, 400);
		await expect(editor.comps()).toHaveCount(2);

		// Connect wire from second to first component
		const secondSourceHandle = editor.getHandle("OR", "in1").first(); // Second component input
		const targetHandle = editor.getHandle("AND", "out").first(); // First component output
		await editor.drag(secondSourceHandle, targetHandle);
		await expect(editor.wires()).toHaveCount(2);

		// Switch to delete mode
		await editor.toggleDelete();

		// Delete first wire and confirm
		const firstWire = editor.wires().first();
		await firstWire.hover({ force: true }); // has pointer-events: none
		await expect(firstWire).toHaveAttribute(
			"stroke",
			"var(--component-delete-color)",
		);
		await firstWire.click({ force: true });
		await expect(editor.wires()).toHaveCount(1);

		// Delete second component and confirm
		const secondComponent = editor.comps().nth(1);
		await secondComponent.hover();
		await expect(secondComponent).toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);
		await secondComponent.click();
		await expect(editor.comps()).toHaveCount(1);
		await expect(editor.wires()).toHaveCount(1);
		await expect(editor.handles()).toHaveCount(4); // 3 for first component + 1 for wire

		// Undo component deletion and confirm
		await editor.undo();
		await expect(editor.comps()).toHaveCount(2);
		await expect(editor.comps().nth(1)).not.toHaveAttribute(
			"fill",
			"var(--component-delete-color)",
		);

		// Undo wire deletion and confirm
		await editor.undo();
		await expect(editor.wires()).toHaveCount(2);
		await expect(editor.wires().first()).not.toHaveAttribute(
			"stroke",
			"var(--component-delete-color)",
		);
	});
	test("delete wire with handle", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 500, 100);
		await editor.dragTo(editor.getHandle("AND", "out").first(), 400, 200);

		await editor.toggleDelete();

		await pointer.clickOn(editor.getHandle("wire", "output").first());

		await expect(editor.wires()).toHaveCount(0);
	});
});

test.describe("other", () => {
	test("has title", async ({ page }) => {
		await expect(page).toHaveTitle("SimpleLogic");
	});

	test("sidebar disappears when editing", async ({ page, editor }) => {
		await editor.initiateAddComponent("AND");
		await expect(page.locator(".sidebar")).not.toBeVisible();
	});

	test("snaps", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 100, 200);
		await editor.toggleSidebar("tools");

		await pointer.downAt(100, 200);
		await pointer.moveTo(20, 20);
		const boundingBox1 = (await editor.comps().boundingBox())!;
		await pointer.moveTo(15, 15);
		const boundingBox2 = (await editor.comps().boundingBox())!;
		expect(boundingBox1).toStrictEqual(boundingBox2);
	});

	test("disable same handles", async ({ page, editor, pointer, hasTouch }) => {
		// Create components
		await editor.addComponent("AND", 600, 200);
		await editor.addComponent("OR", 600, 600);

		// drag two wires from output
		const outputHandle = editor.getHandle("AND", "out").first();
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
		pointer,
		editor,
	}) => {
		await editor.loadCircuitUsingClipboard(circuits.multiconnected);
		// Move canvas to the right
		await pointer.downAt(500, 500);
		await pointer.moveTo(600, 600);
		await pointer.up();

		let middleHandle = editor.getHandle("wire", "output").nth(3);
		await middleHandle.hover();
		await pointer.down();
		await expect(editor.handles()).toHaveCount(2);
		const targetHandle = editor.handles().nth(1);
		await targetHandle.hover();
		await pointer.up();
		await expect(editor.handles()).toHaveCount(9);
	});
});

test.describe("toolbar actions", async () => {
	test("undo", async ({ page, editor, pointer, hasTouch }) => {
		// Add components
		await editor.addComponent("AND", 350, 300);
		await editor.addComponent("AND", 500, 500);

		// Move Component
		await editor.comps().nth(1).hover();
		await pointer.down();
		await pointer.moveTo(400, 400);
		await pointer.up();

		const handle = editor.getHandle("AND", "in2").nth(1);
		const [x1, y1] = await getAttrs(handle, "cx", "cy");

		// Create Wire
		await pointer.downOn(handle);
		await pointer.moveTo(300, 300);
		await pointer.up();

		// Undo Wire
		await editor.undo();
		await expect(handle).toHaveAttribute("cx", x1);
		await expect(handle).toHaveAttribute("cy", y1);

		// Undo component move
		await expectPosToBe(editor.comps().nth(1), 400, 400);
		await editor.undo();
		await expectPosToBe(editor.comps().nth(1), 500, 500);

		// Undo Components
		await expect(editor.comps()).toHaveCount(2);
		await editor.undo();
		await expect(editor.comps()).toHaveCount(1);
		await editor.undo();
		await expect(editor.comps()).toHaveCount(0);

		// Undo while adding
		await editor.addComponent("AND", 300, 100); // Add component
		if (!hasTouch) {
			await page.keyboard.press("a"); // Start adding another component
			await expect(editor.comps()).toHaveCount(2);
			await page.keyboard.press("Control+KeyZ");
			await expect(editor.comps()).toHaveCount(1);
		}

		// Undo while moving
		await editor.comps().hover();
		await pointer.down();
		await pointer.moveTo(200, 200);
		await page.keyboard.press("Control+KeyZ");
		// Component should be back at 100, 100
		await expectPosToBe(editor.comps(), 300, 100);
	});
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
		await editor.toggleSimulate();
		await page.getByRole("button", { name: "Clear" }).click();
		await expect(editor.comps()).toHaveCount(0);
		await expect(page).toHaveMode("edit");
	});
});

test.describe("theme switcher", async () => {
	test("theme switcher switches themes", async ({ page, editor }) => {
		await editor.toggleAccountButton();

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

		await editor.addComponent("AND", 400, 200);

		await pointer.down();
		await pointer.moveTo(500, 50);
		await expectPosToBe(editor.comps(), 500, 50);

		await pointer.moveTo(400, 300);
		await expectPosToBe(editor.comps(), 400, 300);
		await pointer.up();
		await pointer.moveTo(100, 100);
		await expectPosToBe(editor.comps(), 400, 300);
	});
	test("can pan and zoom while simulating", async ({ editor, pointer }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.toggleSimulate();
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
		await editor.addComponent("AND", 400, 100);
		await pointer.down();
		await pointer.moveTo(500, 500);
		await page.keyboard.press("Escape");
		await expectPosToBe(editor.comps(), 400, 100);

		const svgContents = await page.locator(".canvasWrapper svg").innerHTML();

		await pointer.moveTo(400, 100);
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
		editor,
		pointer,
	}) => {
		await editor.addComponent("IN", 400, 100);
		await editor.toggleSimulate();

		const component = editor.comps().first();
		await pointer.clickOn(component, true);
		// Component should be powered
		await expect(component).toBePowered();

		await pointer.moveTo(500, 500);
		await pointer.down();
		await pointer.moveTo(600, 600);

		// Component should still be powered
		await expect(component).toBePowered();

		await pointer.up();
	});
});

test.describe("simulating", () => {
	test("can't toggle power in edit mode", async ({ editor, pointer }) => {
		await editor.addComponent("IN", 100, 100);
		await pointer.clickOn(editor.comps().first(), true);
		await expect(editor.comps().first()).not.toBePowered();
	});
	test("can load while simulating", async ({ editor }) => {
		await editor.toggleSimulate();
		await editor.loadCircuitUsingClipboard(circuits.singleAnd);
		await expect(editor.comps()).toHaveCount(1);
	});
	test("build half adder flow", async ({ editor, pointer }) => {
		// Add inputs
		await editor.addComponent("IN", 400, 100);
		await editor.addComponent("IN", 400, 200);

		// Add XOR gate for sum
		await editor.addComponent("XOR", 500, 150);

		// Add AND gate for carry
		await editor.addComponent("AND", 500, 250);

		// Add LED gates for outputs
		await editor.addComponent("LED", 650, 150); // Sum output
		await editor.addComponent("LED", 650, 250); // Carry output

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
		await editor.loadCircuitUsingClipboard(circuits.rippleCarryAdder);

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
		await editor.loadCircuitUsingClipboard(circuits.SR_NOR_latch);

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

test.describe("sidebars", () => {
	test("tools sidebar can be toggled", async ({ editor }) => {
		await expect(editor.getSidebar("tools")).toBeExpanded();
		await editor.toggleSidebar("tools");
		await expect(editor.getSidebar("tools")).toBeCollapsed();
		await editor.toggleSidebar("tools");
		await expect(editor.getSidebar("tools")).toBeExpanded();
	});
	test("selection sidebar can be toggled", async ({ editor }) => {
		await expect(editor.getSidebar("selection")).not.toBeVisible();
		await editor.addComponent("AND", 100, 100);
		await expect(editor.getSidebar("selection")).toBeExpanded();
		await editor.toggleSidebar("selection");
		await expect(editor.getSidebar("selection")).toBeCollapsed();
		await editor.toggleSidebar("selection");
		await expect(editor.getSidebar("selection")).toBeExpanded();
	});
	test("delete button works", async ({ editor }) => {
		// Add component and verify it exists
		await editor.addComponent("AND", 100, 200);
		await expect(editor.comps()).toBeVisible();

		// Delete and verify removal
		await editor.deleteSelected();
		await expect(editor.comps()).toHaveCount(0);
	});
	test("sidebar shrinks when content collapses, and content stays collapsed after closing and reopening sidebar", async ({
		editor,
	}) => {
		const sidebar = editor.getSidebar("tools");
		await expect(sidebar).toBeExpanded();
		const initialHeight = await sidebar.evaluate((el) => el.scrollHeight);

		// Collapse section
		await sidebar.getByText("Components").click();
		await expect(sidebar).toBeExpanded();
		await sidebar.locator(".sidebar-content").hover(); // Wait for animation to finish = element to be stable

		// Verify sidebar has shrunk
		const sectionCollapsedHeight = await sidebar.evaluate(
			(el) => el.scrollHeight,
		);
		expect(sectionCollapsedHeight).toBeLessThan(initialHeight);

		// Close and reopen sidebar
		await editor.toggleSidebar("tools");
		await editor.toggleSidebar("tools");

		// Verify section is still collapsed
		const finalHeight = await sidebar.evaluate((el) => el.scrollHeight);
		expect(finalHeight).toEqual(sectionCollapsedHeight);
	});
	test("handles rapid sidebar toggling", async ({ editor, pointer }) => {
		const sidebar = editor.getSidebar("tools");
		await sidebar.getByText("Tools").hover();

		// Rapidly toggle multiple times
		for (let i = 0; i < 5; i++) {
			await pointer.down();
			await pointer.up();
		}

		// Wait for any pending animations to complete
		await expect(sidebar).toBeCollapsed();
	});
});

test.describe("selection", () => {
	test("selection flow", async ({ page, editor, pointer }) => {
		// ===== Component Selection Flow =====
		// Add component, verify selected
		await editor.addComponent("AND", 400, 200);
		await expect(editor.comps()).toBeSelected();
		await editor.toggleSidebar("tools");

		// Click on canvas to deselect
		await pointer.clickAt(400, 100);
		await expect(editor.comps()).not.toBeSelected();

		// Click on component to select
		await pointer.clickOn(editor.comps());
		await expect(editor.comps()).toBeSelected();

		// Move canvas, verify not deselected
		await pointer.downAt(400, 100);
		await pointer.moveTo(200, 200);
		await expect(editor.comps()).toBeSelected();
		await pointer.up();

		// Click on component to deselect
		await pointer.clickOn(editor.comps());
		await expect(editor.comps()).not.toBeSelected();

		// Move component, verify selected
		await editor.dragTo(editor.comps(), 500, 300);
		await expect(editor.comps()).toBeSelected();

		// ===== Wire Selection Flow =====
		// Add wire, verify selected, component not selected
		const handle = editor.getHandle("AND", "out").first();
		await editor.dragTo(handle, 400, 500);
		await expect(editor.wires()).toBeSelected();
		await expect(editor.comps()).not.toBeSelected();

		// Click on canvas to deselect
		await pointer.clickAt(700, 100);
		await expect(editor.wires()).not.toBeSelected();

		// Click on wire to select
		await pointer.clickOn(editor.wires(), true);
		await expect(editor.wires()).toBeSelected();

		// Move canvas, verify not deselected
		await pointer.downAt(600, 100);
		await pointer.moveTo(600, 200);
		await expect(editor.wires()).toBeSelected();
		await pointer.up();

		// Click on wire to deselect
		await editor.wires().click({ force: true });
		await expect(editor.wires()).not.toBeSelected();

		// Move wire, verify selected
		await editor.dragTo(editor.wires(), 600, 700, true);
		await expect(editor.wires()).toBeSelected();

		// Click wire to deselect it
		await editor.wires().click({ force: true });
		await expect(editor.wires()).not.toBeSelected();

		// Click wire handle, verify wire selected
		const wireHandle = editor.getHandle("wire", "output").first();
		await pointer.clickOn(wireHandle);
		await expect(editor.wires()).toBeSelected();

		// Click wire handle again, verify wire deselected
		await pointer.clickOn(wireHandle, true);
		await expect(editor.wires()).not.toBeSelected();

		// ===== Undo Operations =====
		// Undo twice, verify wire disappeared
		await editor.undo();
		await expect(editor.wires()).toHaveCount(0);

		// Undo twice, verify component disappeared
		await editor.undo();
		await editor.undo();
		await expect(editor.comps()).toHaveCount(0);
	});
	test("selection doesn't work in simulation mode", async ({
		editor,
		pointer,
	}) => {
		// Add component and verify initial selection
		await editor.addComponent("AND", 400, 200);
		await expect(editor.comps()).toBeSelected();

		// Move to simulate mode
		await editor.setMode("simulate");

		// Verify deselected when entering simulation mode
		await expect(editor.comps()).not.toBeSelected();

		// Click it, verify it stays unselected in simulation mode
		await pointer.clickOn(editor.comps());
		await expect(editor.comps()).not.toBeSelected();

		// Switch back to edit mode and verify still unselected
		await editor.setMode("edit");
		await expect(editor.comps()).not.toBeSelected();
	});
});
test.describe("user button", () => {
	test("can toggle user button", async ({ editor }) => {
		await editor.toggleAccountButton();
		await expect(editor.getAccountMenu()).toBeVisible();
		await editor.toggleAccountButton();
		await expect(editor.getAccountMenu()).not.toBeVisible();
	});
});
test.describe("grid snap", () => {
	test("grid snap flow", async ({ editor }) => {
		// Add component at 600, 300
		await editor.addComponent("AND", 600, 300);
		const component = editor.comps();

		// Get initial position
		const initialX = await getAttr(component, "x");

		// Disable grid snap
		await editor.setGridSnap(false);

		// Move component by 1 pixel
		await editor.dragTo(component, 601, 300);

		// Ensure x attribute has changed after 1 pixel movement with grid snap off
		const posAfterNoSnapMove = await getAttr(component, "x");
		expect(posAfterNoSnapMove).not.toEqual(initialX);

		// Enable grid snap
		await editor.setGridSnap(true);

		// Move by 1 pixel first time with snap on
		const posBeforeFirstSnapMove = await getAttr(component, "x");
		await editor.dragTo(component, 602, 300);

		// This first 1 pixel move with grid snap on should still cause movement
		// because it could reach the next grid position
		const posAfterFirstSnapMove = await getAttr(component, "x");
		expect(posAfterFirstSnapMove).not.toEqual(posBeforeFirstSnapMove);

		// Move by 1 pixel again
		await editor.dragTo(component, 603, 300);

		// The second 1 pixel move shouldn't change position because
		// grid snap prevents movement until reaching next grid position
		const posAfterSecondSnapMove = await component.getAttribute("x");
		expect(posAfterSecondSnapMove).toEqual(posAfterFirstSnapMove);
	});
});
test.describe("rotation", () => {
	test("rotation with wire connections", async ({ editor, pointer }) => {
		// Add component
		await editor.addComponent("AND", 400, 300);
		const component = editor.comps();

		// Get handles
		const in1Handle = editor.getHandle("AND", "in1").first();
		const in2Handle = editor.getHandle("AND", "in2").first();
		const outHandle = editor.getHandle("AND", "out").first();

		// Connect 3 wires
		await editor.dragTo(in1Handle, 300, 200);
		await editor.dragTo(in2Handle, 300, 400);
		await editor.dragTo(outHandle, 500, 300);

		// Get initial wire paths
		const wire1 = editor.wires().nth(0);
		const wire2 = editor.wires().nth(1);
		const wire3 = editor.wires().nth(2);

		const initialPath1 = await getAttr(wire1, "d");
		const initialPath2 = await getAttr(wire2, "d");
		const initialPath3 = await getAttr(wire3, "d");

		// Select component again
		await pointer.clickOn(component);

		// Rotate cw with wires
		await editor.rotateSelected("cw");
		await expect(component).toBeRotated(90);

		// Check wires adjusted correctly
		await expect(wire1).toHaveAttribute("d", "M240 160 L340 200");
		await expect(wire2).toHaveAttribute("d", "M240 320 L300 200");
		await expect(wire3).toHaveAttribute("d", "M320 280 L400 240");

		// Rotate ccw
		await editor.rotateSelected("ccw");
		await expect(component).toBeRotated(0);

		// Check wires back to original
		await expect(wire1).toHaveAttribute("d", initialPath1);
		await expect(wire2).toHaveAttribute("d", initialPath2);
		await expect(wire3).toHaveAttribute("d", initialPath3);

		// Rotate ccw again
		await editor.rotateSelected("ccw");
		await expect(component).toBeRotated(270);

		// Check wires in new position
		await expect(wire1).toHaveAttribute("d", "M240 160 L300 280");
		await expect(wire2).toHaveAttribute("d", "M240 320 L340 280");
		await expect(wire3).toHaveAttribute("d", "M320 200 L400 240");

		// Undo
		await editor.undo();
		await expect(component).toBeRotated(0);

		// Check wires back to original after undo
		await expect(wire1).toHaveAttribute("d", initialPath1);
		await expect(wire2).toHaveAttribute("d", initialPath2);
		await expect(wire3).toHaveAttribute("d", initialPath3);
	});

	test("should maintain wire connections after full rotations and undos", async ({
		editor,
		pointer,
	}) => {
		// Create component with multiple wire connections
		await editor.addComponent("AND", 400, 200);
		const component = editor.comps();

		// Create wires connected to the output
		await editor.dragTo(editor.getHandle("AND", "out").first(), 400, 180);
		await editor.dragTo(editor.getHandle("AND", "out").first(), 400, 240);
		await editor.dragTo(editor.getHandle("AND", "out").first(), 400, 300);
		const wire1 = editor.wires().first();
		const wire2 = editor.wires().nth(1);
		const wire3 = editor.wires().nth(2);

		// Store initial paths
		const initialPath1 = await wire1.getAttribute("d");
		const initialPath2 = await wire2.getAttribute("d");
		const initialPath3 = await wire3.getAttribute("d");

		// Select the component
		await pointer.clickOn(component);

		await editor.rotateSelected("cw");
		// expect that all wires changed
		await expect(wire1).toHaveAttribute("d", "M320 200 L320 140");
		await expect(wire2).toHaveAttribute("d", "M320 200 L320 180");
		await expect(wire3).toHaveAttribute("d", "M320 200 L320 240");

		// Rotate 3 more times
		for (let i = 0; i < 3; i++) {
			await editor.rotateSelected("cw");
		}

		// Check component is back at 0° rotation
		await expect(component).toBeRotated(0);

		// Check wires are still in correct position after full rotation
		await expect(wire1).toHaveAttribute("d", initialPath1);
		await expect(wire2).toHaveAttribute("d", initialPath2);
		await expect(wire3).toHaveAttribute("d", initialPath3);

		// Undo 4 times
		for (let i = 0; i < 4; i++) {
			await editor.undo();
		}

		// Verify wires maintained their positions
		await expect(wire1).toHaveAttribute("d", initialPath1);
		await expect(wire2).toHaveAttribute("d", initialPath2);
		await expect(wire3).toHaveAttribute("d", initialPath3);
	});

	test("rotation flow", async ({ editor }) => {
		// Add component at specific position
		await editor.addComponent("AND", 400, 300);
		const component = editor.comps();

		// Select and rotate the component 90 degrees clockwise
		await editor.rotateSelected("cw");
		await expect(component).toBeRotated(90);

		// Get the rotated output handle position
		const rotatedOutputHandle = editor.getHandle("AND", "out").first();
		const [rotatedCx, rotatedCy] = await rotatedOutputHandle.evaluate((el) => [
			el.getAttribute("cx"),
			el.getAttribute("cy"),
		]);

		// Create a new wire from the rotated handle
		await editor.dragTo(rotatedOutputHandle, 500, 400);

		// Verify the wire starts from the rotated handle position, not the original position
		const newWire = editor.wires().first();
		const wireD = await newWire.getAttribute("d");

		// The wire should start from the rotated handle position
		// For a 90-degree clockwise rotation of an AND gate at (400, 300),
		// the output handle should be at approximately (320, 280)
		expect(wireD).toMatch(/^M320 280 L/);

		// Now move the rotated component and verify wires stay correctly positioned
		await editor.dragTo(component, 600, 500);
		await expectPosToBe(component, 600, 500);

		// Verify the component is still rotated after moving
		await expect(component).toBeRotated(90);

		// Get the handle position after moving
		const movedHandle = editor.getHandle("AND", "out").first();
		const [movedCx, movedCy] = await movedHandle.evaluate((el) => [
			el.getAttribute("cx"),
			el.getAttribute("cy"),
		]);

		// Verify the handle itself moved to the correct rotated position
		expect(parseInt(movedCx)).toBe(500);
		expect(parseInt(movedCy)).toBe(400);

		// Verify the wire moved with the component and maintains correct rotated relationship
		const movedWireD = await newWire.getAttribute("d");

		// The wire should start from the new rotated handle position
		expect(movedWireD).toMatch(/^M460 440 L/);
	});
});

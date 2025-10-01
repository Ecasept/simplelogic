import { expect, expectPosToBe, test } from "./common";

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
		await editor.dragTo(editor.wires(), 400, 500, true);
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
	test("ctrl-click flow", async ({ page, editor, pointer }) => {
		// Add two components
		await editor.addComponent("AND", 400, 400);
		await editor.addComponent("OR", 600, 600);
		const first = editor.comps().nth(0);
		const second = editor.comps().nth(1);

		// Ctrl-click the first, expect selected
		await page.keyboard.down("Control");
		await pointer.clickOn(first, true);
		await page.keyboard.up("Control");

		await expect(first).toBeSelected();
		await expect(second).toBeSelected();

		// Move first, expect both selected and moved
		await editor.dragTo(first, 450, 450);
		await expect(first).toBeSelected();
		await expect(second).toBeSelected();
		await expectPosToBe(first, 450, 450);
		await expectPosToBe(second, 650, 650);

		// Ctrl-click with move second, expect both selected and moved
		await page.keyboard.down("Control");
		await pointer.downOn(second);
		await pointer.moveTo(700, 700);
		await pointer.up();
		await expect(first).toBeSelected();
		await expect(second).toBeSelected();
		await expectPosToBe(first, 500, 500);
		await expectPosToBe(second, 700, 700);

		// Ctrl-click second, expect only first selected
		await pointer.clickOn(second);
		await expect(first).toBeSelected();
		await expect(second).not.toBeSelected();

		// Ctrl-click second, expect both selected
		await pointer.clickOn(second);
		await expect(first).toBeSelected();
		await expect(second).toBeSelected();

		// Ctrl-click first, expect only second selected
		await pointer.clickOn(first);
		await expect(first).not.toBeSelected();
		await expect(second).toBeSelected();

		// Ctrl-click second, expect both unselected
		await pointer.clickOn(second);
		await expect(first).not.toBeSelected();
		await expect(second).not.toBeSelected();

		await page.keyboard.up("Control");
	});
	test("multi-selection click", async ({ editor, pointer, page }) => {
		// Add two components
		await editor.addComponent("AND", 400, 200);
		await editor.addComponent("OR", 600, 400);
		const andGate = editor.comps().first();
		const orGate = editor.comps().last();

		// Select both components
		await editor.ctrlSelect(andGate);

		// Verify both are selected
		await expect(andGate).toBeSelected();
		await expect(orGate).toBeSelected();

		// Click on one of them
		await pointer.clickOn(andGate);

		// Verify only the clicked one remains selected
		await expect(andGate).toBeSelected();
		await expect(orGate).not.toBeSelected();
	});
	test("move multiple selected elements", async ({ editor, pointer }) => {
		// Add two components
		await editor.addComponent("AND", 400, 400);
		await editor.addComponent("OR", 600, 600);
		const andGate = editor.comps().first();
		const orGate = editor.comps().last();

		// Select both components
		await editor.ctrlSelect(andGate);

		// Verify both are selected
		await expect(andGate).toBeSelected();
		await expect(orGate).toBeSelected();

		// Drag one of the components
		await editor.dragTo(andGate, 500, 500);

		// Verify both moved
		await expectPosToBe(andGate, 500, 500);
		await expectPosToBe(orGate, 700, 700);
	});

	test("move unselected element from a selection", async ({
		editor,
		pointer,
	}) => {
		// Add three components
		await editor.addComponent("AND", 400, 200);
		await editor.addComponent("OR", 400, 400);
		await editor.addComponent("XOR", 600, 200);
		const andGate = editor.comps().nth(0);
		const orGate = editor.comps().nth(1);
		const xorGate = editor.comps().nth(2);

		// Select first two components
		await pointer.clickOn(andGate);
		await editor.ctrlSelect(orGate);

		// Verify they are selected
		await expect(andGate).toBeSelected();
		await expect(orGate).toBeSelected();
		await expect(xorGate).not.toBeSelected();

		// Drag the unselected component
		await editor.dragTo(xorGate, 700, 300);

		// Verify selection is cleared, the dragged component is selected, and only it moves
		await expect(andGate).not.toBeSelected();
		await expect(orGate).not.toBeSelected();
		await expect(xorGate).toBeSelected();
		await expectPosToBe(andGate, 400, 200);
		await expectPosToBe(orGate, 400, 400);
		await expectPosToBe(xorGate, 700, 300);
	});

	test("delete multiple selected elements with sidebar button", async ({
		editor,
		pointer,
	}) => {
		// Add two components
		await editor.addComponent("AND", 400, 200);
		await editor.addComponent("OR", 400, 400);
		const andGate = editor.comps().first();
		const orGate = editor.comps().last();

		await pointer.clickAt(400, 100); // Deselect everything

		// Select both components
		await editor.ctrlSelect(andGate);
		await editor.ctrlSelect(orGate);

		// The selection sidebar should be visible now.
		await expect(editor.getSidebar("selection")).toBeVisible();

		// Click delete button
		await editor.deleteSelected();

		// Assert that both components are removed
		await expect(editor.comps()).toHaveCount(0);
	});
});

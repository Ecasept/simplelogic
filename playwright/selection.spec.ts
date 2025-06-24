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
	test("ctrl-click flow", async ({ page, editor, pointer }) => {
		// Add two components
		await editor.addComponent("AND", 500, 500);
		await editor.addComponent("OR", 700, 700);
		const first = editor.comps().nth(0);
		const second = editor.comps().nth(1);

		// Ctrl-click the first, expect selected
		await page.keyboard.down("Control");
		await pointer.clickOn(first, true);
		await page.keyboard.up("Control");

		await expect(first).toBeSelected();
		await expect(second).toBeSelected();

		// Move first, expect only first selected
		await editor.dragTo(first, 550, 550);
		await expect(first).toBeSelected();
		await expect(second).not.toBeSelected();

		// Ctrl-click with move second, expect both selected and not moved
		await page.keyboard.down("Control");
		await pointer.downOn(second);
		await pointer.moveTo(750, 550);
		await pointer.up();
		await expect(first).toBeSelected();
		await expect(second).toBeSelected();
		// Check that second did not move
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
});

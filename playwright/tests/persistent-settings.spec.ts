import { expect, test } from "../common";

// Tests that editor settings (grid snap & area select type) persist across a reload via localStorage
// Relies on editorViewModel.updateSettings() writing to localStorage under key 'editorSettings'
// and +page.svelte reading & applying them on mount.
test.describe("persistent settings", () => {
	test("persists grid snap and area select type across reload", async ({
		editor,
		page,
	}) => {
		const gridSnapSwitch = page.getByRole("switch", { name: "Grid snap" });
		await expect(gridSnapSwitch).toBeChecked();

		const intersectOption = page.getByRole("radio", { name: "Intersect" });
		const containOption = page.getByRole("radio", { name: "Contain" });
		await expect(intersectOption).toBeChecked();
		await expect(containOption).not.toBeChecked();

		// Toggle both settings
		await gridSnapSwitch.click();
		await containOption.click();

		await expect(gridSnapSwitch).not.toBeChecked();
		await expect(containOption).toBeChecked();
		await expect(intersectOption).not.toBeChecked();

		// Reload page (new Svelte mount should read from localStorage)
		await editor.reload();

		// After reload, the toggled settings should persist
		await expect(
			page.getByRole("switch", { name: "Grid snap" }),
		).not.toBeChecked();
		await expect(page.getByRole("radio", { name: "Contain" })).toBeChecked();

		// Functional verification for grid snap persistence:
		// Add a component and move it 1px; with snap disabled this should change x attribute
		await editor.addComponent("AND", 600, 300);
		const component = editor.comps().first();
		const initialX = await component.getAttribute("x");
		await editor.dragTo(component, 601, 300);
		const afterMoveX = await component.getAttribute("x");
		expect(afterMoveX).not.toEqual(initialX);
	});
});

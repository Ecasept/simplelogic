import { expect, test } from '../common';

// Tests that editor settings (grid snap & area select type) persist across a reload via localStorage
// Relies on editorViewModel.updateSettings() writing to localStorage under key 'editorSettings'
// and +page.svelte reading & applying them on mount.
test.describe('persistent settings', () => {
	test('persists grid snap and area select type across reload', async ({ editor, page }) => {
		// Grid snap default: enabled -> button label should read 'Disable grid snap'
		const gridSnapDisableButton = page.getByRole('button', { name: 'Disable grid snap' });
		await expect(gridSnapDisableButton).toBeVisible();

		// Area select default: intersect -> button label "Switch to contain area select"
		const areaSelectContainButton = page.getByRole('button', { name: 'Switch to contain area select' });
		await expect(areaSelectContainButton).toBeVisible();

		// Toggle both settings
		await gridSnapDisableButton.click(); // Disables grid snap -> label should become Enable grid snap
		await areaSelectContainButton.click(); // Switch to contain -> label should become Switch to intersect area select

		// Sanity check labels updated before reload
		await expect(page.getByRole('button', { name: 'Enable grid snap' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Switch to intersect area select' })).toBeVisible();

		// Reload page (new Svelte mount should read from localStorage)
		await editor.reload();

		// After reload, the toggled settings should persist
		await expect(page.getByRole('button', { name: 'Enable grid snap' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Switch to intersect area select' })).toBeVisible();

		// Functional verification for grid snap persistence:
		// Add a component and move it 1px; with snap disabled this should change x attribute
		await editor.addComponent('AND', 600, 300);
		const component = editor.comps().first();
		const initialX = await component.getAttribute('x');
		await editor.dragTo(component, 601, 300);
		const afterMoveX = await component.getAttribute('x');
		expect(afterMoveX).not.toEqual(initialX);
	});
});

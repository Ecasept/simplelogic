import { Page } from '@playwright/test';
import { expect, test } from '../common';

// Tests A, B, C, D from plan:
// A: onboarding shows (fresh) unless no-onboarding param present.
// B: preset screen on fresh load, selecting preset (empty) closes modal & loads empty graph.
// C: manual load (non-fresh) starts on options screen, selecting preset does NOT auto close.
// D: navigation buttons between presets/options behave correctly in fresh and non-fresh flows.

// Helper: count components
async function countComponents(page: Page) {
	return await page.locator('.canvasWrapper .component-body').count();
}

test.withOnboarding();

test.describe('onboarding modal', () => {
	test.describe("onboarding shows/doesn't show", () => {
		test('fresh load shows onboarding preset screen', async ({ page }) => {
			// Fresh page loaded by test fixture
			// Expect modal visible and contains preset screen header text
			await expect(page.locator('.modal-bg')).toBeVisible();
			await expect(page.getByRole('heading', { name: /choose a starter circuit/i })).toBeVisible();
			// Expect navigation button "Other options" visible (fresh preset screen)
			await expect(page.getByRole('button', { name: /other options/i })).toBeVisible();
		});

		test('no-onboarding param skips modal', async ({ page }) => {
			await page.goto('/?no-onboarding');
			await expect(page.locator('.modal-bg')).not.toBeVisible();
		});
	});

	test.describe('preset selection', () => {
		test('B: selecting empty preset closes modal and loads empty graph', async ({ page }) => {
			await expect(page.locator('.modal-bg')).toBeVisible();
			const before = await countComponents(page);
			// Click New Circuit (empty preset)
			await page.getByRole('button', { name: /new empty circuit/i }).click();
			// Modal should close automatically
			await expect(page.locator('.modal-bg')).not.toBeVisible();
			// Graph should remain empty (or be reset) - ensure no components
			const after = await countComponents(page);
			expect(after).toBe(0);
			expect(before).toBe(after);
		});

		test('selecting a non-empty preset closes modal', async ({ page }) => {
			// Need at least one preset card besides empty.
			await page.goto('/');
			await expect(page.locator('.modal-bg')).toBeVisible();
			// Find first preset card that is not "New Circuit"
			const presetCard = page.locator('.preset-card').filter({ hasNotText: 'New Circuit' }).first();
			await presetCard.click();
			await expect(page.locator('.modal-bg')).not.toBeVisible();
			// Graph should have components now
			// expect at least 10 components
			await expect(page.locator('.canvasWrapper .component-body >> nth=9')).toBeVisible();
		});
	});

	test('manual load starts on options screen, preset does not auto-close', async ({ page }) => {
		// Skip onboarding via param then open load modal manually
		await page.goto('/?no-onboarding');
		await expect(page.locator('.modal-bg')).not.toBeVisible();
		// Open load modal (toolbar button)
		await page.getByRole('button', { name: /load circuit/i }).click();
		await expect(page.locator('.modal-bg')).toBeVisible();
		// Should default to options screen (Paste from clipboard button present)
		await expect(page.getByRole('button', { name: /paste from clipboard/i })).toBeVisible();
		// Navigate to presets via Load preset button
		await page.getByRole('button', { name: /load preset/i }).click();
		await expect(page.getByRole('heading', { name: /choose a starter circuit/i })).toBeVisible();
		// Click a preset (use first card)
		const preset = page.locator('.preset-card').first();
		await preset.click();
		// Modal should remain open (non-fresh)
		await expect(page.locator('.modal-bg')).toBeVisible();
		// Graph should have components now
		await expect(page.locator('.canvasWrapper .component-body >> nth=9')).toBeVisible();
	});

	test.describe("navigation", async () => {
		test('navigation buttons work in fresh flow', async ({ page }) => {
			await page.goto('/');
			await expect(page.locator('.modal-bg')).toBeVisible();
			// On presets screen -> click Other options
			await page.getByRole('button', { name: /other options/i }).click();
			await expect(page.getByRole('button', { name: /paste from clipboard/i })).toBeVisible();
			// Go back to presets
			await page.getByRole('button', { name: /back to presets/i }).click();
			await expect(page.getByRole('heading', { name: /choose a starter circuit/i })).toBeVisible();
		});

		test('navigation buttons work in non-fresh flow', async ({ page }) => {
			await page.goto('/?no-onboarding');
			await page.getByRole('button', { name: /load circuit/i }).click();
			// On options screen
			await page.getByRole('button', { name: /load preset/i }).click();
			await expect(page.getByRole('heading', { name: /choose a starter circuit/i })).toBeVisible();
			// Back button (ArrowBigLeft Back)
			await page.getByRole('button', { name: /^back$/i }).click();
			await expect(page.getByRole('button', { name: /paste from clipboard/i })).toBeVisible();
		});
	});
});

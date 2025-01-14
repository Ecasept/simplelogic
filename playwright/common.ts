import { expect, Locator, Page } from "@playwright/test";

export async function reload(page: Page) {
	await page.goto("/");
	await page.waitForLoadState("networkidle");
}

export async function expectPosToBe(component: Locator, x: number, y: number) {
	const boundingBox = (await component.boundingBox())!;

	expect(boundingBox).not.toBeNull();

	const centerX = boundingBox.x + boundingBox.width / 2;
	const centerY = boundingBox.y + boundingBox.height / 2;

	// 30 because of snapping + 5 for other inaccuracies
	expect(Math.abs(centerX - x)).toBeLessThan(35);
	expect(Math.abs(centerY - y)).toBeLessThan(35);
}

export async function drag(
	component: Locator,
	x: number,
	y: number,
	page: Page,
	{
		mouseUp = true,
		expect = true,
	}: { mouseUp?: boolean; expect?: boolean } = {},
) {
	await component.hover();
	await page.mouse.down();
	await page.mouse.move(x, y);
	if (mouseUp) {
		await page.mouse.up();
	}
	if (expect) {
		await expectPosToBe(component, x, y);
	}
}

export async function addComponent(
	page: Page,
	componentName: string,
	x: number,
	y: number,
) {
	await page
		.locator(".sidebarWrapper")
		.getByText(componentName, { exact: true })
		.click();
	await page.mouse.click(x, y);
}

export async function undo(page: Page) {
	await page.getByRole("button", { name: "Undo" }).click();
}

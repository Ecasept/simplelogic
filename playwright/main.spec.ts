import test, { expect, Locator } from "@playwright/test";

async function expectPosToBe(component: Locator, x: number, y: number) {
	const boundingBox = (await component.boundingBox())!;

	expect(boundingBox).not.toBeNull();

	const centerX = boundingBox.x + boundingBox.width / 2;
	const centerY = boundingBox.y + boundingBox.height / 2;

	// 30 because of snapping
	expect(Math.abs(centerX - x)).toBeLessThan(30);
	expect(Math.abs(centerY - y)).toBeLessThan(30);
}

test.describe("editor", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});
	test("has title", async ({ page }) => {
		// await page.goto("/");
		await expect(page).toHaveTitle("SimpleLogic");
	});

	test("adds component at correct position", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();

		await page.mouse.click(100, 200);

		const component = page.locator("rect").nth(1);
		await expect(component).toBeVisible();

		await expectPosToBe(component, 100, 200);
	});
	test("adds multiple components", async ({ page }) => {
		const andBtn = page.getByRole("button", { name: "Add AND" });
		const orBtn = page.getByRole("button", { name: "Add OR" });

		await andBtn.click();
		await page.mouse.click(100, 100);

		await orBtn.click();
		await page.mouse.click(200, 100);

		await andBtn.click();
		await page.mouse.click(200, 100);

		await orBtn.click();
		await page.mouse.click(100, 200);

		await expect(page.locator("rect").nth(1)).toBeVisible();
		await expect(page.locator("rect").nth(2)).toBeVisible();
		await expect(page.locator("rect").nth(3)).toBeVisible();
		await expect(page.locator("rect").nth(4)).toBeVisible();
	});
	test("toggles sidebar correctly", async ({ page }) => {
		expect(await page.locator(".sidebarWrapper.open").count()).toBe(1);
		await page.getByRole("button", { name: "▶" }).click();
		expect(await page.locator(".sidebarWrapper.open").count()).toBe(0);
		await page.getByRole("button", { name: "▶" }).click();
		expect(await page.locator(".sidebarWrapper.open").count()).toBe(1);
	});
	test("moves components correctly", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(100, 200);

		await page.mouse.down();
		await page.mouse.move(500, 50, { steps: 10 });
		await expectPosToBe(page.locator("rect").nth(1), 500, 50);

		await page.mouse.move(400, 300, { steps: 10 });
		await expectPosToBe(page.locator("rect").nth(1), 400, 300);
		await page.mouse.up();
		await page.mouse.move(100, 100, { steps: 10 });
		await expectPosToBe(page.locator("rect").nth(1), 400, 300);
	});
	test("snaps", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(100, 200);
		await page.mouse.down();
		await page.mouse.move(0, 0, { steps: 10 });
		const boundingBox1 = (await page.locator("rect").nth(1).boundingBox())!;
		await page.mouse.move(5, 5, { steps: 10 });
		const boundingBox2 = (await page.locator("rect").nth(1).boundingBox())!;
		expect(boundingBox1).toStrictEqual(boundingBox2);
	});
	test("drags and moves new wires", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();

		// Click handle
		await page.mouse.click(100, 200);
		const originalHandle = page.locator("circle.handle").nth(2);
		await originalHandle.hover();
		expect(await originalHandle.getAttribute("r")).toBe("10");
		await page.mouse.down();

		// Move handle
		const handle = page.locator("circle.handle").nth(3);
		await page.mouse.move(300, 300, { steps: 10 });
		await expectPosToBe(handle, 300, 300);
		await expect(page.locator("path").first()).toBeVisible();

		// Move handle
		await page.mouse.move(400, 400, { steps: 10 });
		await expectPosToBe(handle, 400, 400);

		// Release and move mouse
		await page.mouse.up();
		await page.mouse.move(200, 200, { steps: 10 });
		await expectPosToBe(handle, 400, 400);
		expect(await page.locator("circle.handle").count()).toBe(4);
	});
	test("drags wires with components", async ({ page }) => {
		await page.getByRole("button", { name: "Add AND" }).click();

		await page.mouse.click(500, 500);

		const handle = page.locator("circle.handle").nth(0);
		await handle.hover();
		await page.mouse.down();
		await page.mouse.move(100, 100);
		await page.mouse.up();

		const d1 = await page.locator("path").getAttribute("d");
		await page.locator("rect").nth(1).hover();
		await page.mouse.down();
		await page.mouse.move(200, 300);
		await page.mouse.up();
		const d2 = await page.locator("path").getAttribute("d");
		expect(d1).not.toBe(d2);
	});
	test("undo", async ({ page }) => {
		// Add components
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(300, 300);
		await page.getByRole("button", { name: "Add AND" }).click();
		await page.mouse.click(500, 500);

		// Move Component
		await page.locator("rect").nth(2).hover();
		await page.mouse.down();
		await page.mouse.move(100, 100);
		await page.mouse.up();

		const handle = page.locator("circle").nth(4);
		const x1 = await handle.getAttribute("cx");
		const y1 = await handle.getAttribute("cy");

		// Drag Wire
		await page.locator("circle").nth(4).hover();
		await page.mouse.down();
		await page.mouse.move(300, 300);
		await page.mouse.up();

		// Undo Wire
		await page.getByRole("button", { name: "Undo" }).click();
		const x2 = await handle.getAttribute("cx");
		const y2 = await handle.getAttribute("cy");
		expect(x1).toBe(x2);
		expect(y1).toBe(y2);

		// Undo Move
		await expectPosToBe(page.locator("rect").nth(2), 100, 100);
		await page.getByRole("button", { name: "Undo" }).click();
		await expectPosToBe(page.locator("rect").nth(2), 500, 500);

		// Undo Components
		expect(await page.locator("rect").count()).toBe(3);
		await page.getByRole("button", { name: "Undo" }).click();
		expect(await page.locator("rect").count()).toBe(2);
		await page.getByRole("button", { name: "Undo" }).click();
		expect(await page.locator("rect").count()).toBe(1);

		// Undo nothing
		const innerHTML1 = page.locator(".canvasWrapper").innerHTML;
		await page.getByRole("button", { name: "Undo" }).click();
		const innerHTML2 = page.locator(".canvasWrapper").innerHTML;
		expect(innerHTML1).toBe(innerHTML2);

		// Add component without committing
		await page.getByRole("button", { name: "Add OR" }).click();
		await page.mouse.move(500, 500);

		// Press undo
		await page.getByRole("button", { name: "Undo" }).click();
		expect(await page.locator("rect").count()).toBe(1);
	});
});

import { expect, Locator, Page } from "@playwright/test";
import { expectPosToBe, Pointer, test } from "../common";

async function addComponent(
	page: Page,
	pointer: Pointer,
	type: string,
	x: number,
	y: number,
) {
	await page
		.locator(".sidebarWrapper")
		.getByText(type, { exact: true })
		.click();
	await pointer.tap(x, y);
}

function comp(page: Page) {
	return page.locator(".component-body");
}

async function connect(pointer: Pointer, handle1: Locator, handle2: Locator) {
	await pointer.downOn(handle1);
	await pointer.moveTo(handle2);
	await pointer.up();
}

async function drag(pointer: Pointer, locator: Locator, x: number, y: number) {
	await pointer.downOn(locator);
	await pointer.move(x, y);
	await pointer.up();
}

test.describe("Mobile", () => {
	test("can edit", async ({ page, touchscreen, editor }) => {
		const pointer = touchscreen.createPointer();
		await addComponent(page, pointer, "AND", 100, 100);
		await addComponent(page, pointer, "AND", 200, 200);

		await expectPosToBe(comp(page).first(), 100, 100);

		await connect(
			pointer,
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in1").nth(1),
		);

		await drag(pointer, comp(page).first(), 100, 100);

		await expect(page.locator(".wire")).toHaveAttribute("d", "M181 141 L241 261");
	});
});

import { ElementHandle, expect, Locator, Page } from "@playwright/test";

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

export async function dragHandle(
	source: Locator | ElementHandle<SVGElement | HTMLElement>,
	dest: Locator | ElementHandle<SVGElement | HTMLElement>,
	page: Page,
) {
	await source.hover();
	await page.mouse.down();
	await dest.hover();
	await page.mouse.up();
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

export async function getAttr(locator: Locator, attr: string) {
	const val = await locator.getAttribute(attr);
	expect(val).not.toBeNull();
	return val!;
}

export async function getAttrs(locator: Locator, ...attrs: string[]) {
	const values = await Promise.all(attrs.map((attr) => getAttr(locator, attr)));
	return values;
}

export async function loadCircuit(circuit: string, page: Page) {
	try {
		await page.evaluate((text) => {
			return navigator.clipboard.writeText(text);
		}, circuit);
	} catch (e) {
		const modifier = process.platform === "darwin" ? "Meta" : "Control";
		// Create a temporary input element and copy from it
		await page.evaluate((text) => {
			const input = document.createElement("input");
			input.id = "test-copy-input";
			input.value = text;
			document.body.appendChild(input);
			input.select();
			document.body.removeChild(input);
		}, circuit);

		await page.keyboard.press("${modifier}+KeyC");

		await page.evaluate(() => {
			const input = document.querySelector(
				"#test-copy-input",
			) as HTMLInputElement;
			document.body.removeChild(input);
		});
	}

	await page.getByRole("button", { name: "Load" }).click();
	await page.getByRole("button", { name: "Paste from clipboard" }).click();
}

export function throwOnConsoleError(page: Page) {
	page.on("console", (message) => {
		if (message.type() === "error") {
			throw new Error("Error in console: " + message.text());
		}
	});
}

import {
	test as base,
	expect as baseExpect,
	Locator,
	MatcherReturnType,
	Page,
} from "@playwright/test";
import { DesktopPointer, Editor, Pointer } from "./fixtures";
import { Touchscreen } from "./mobile/touchscreen";

export async function expectPosToBe(component: Locator, x: number, y: number) {
	const boundingBox = (await component.boundingBox())!;

	expect(boundingBox).not.toBeNull();

	const centerX = boundingBox.x + boundingBox.width / 2;
	const centerY = boundingBox.y + boundingBox.height / 2;

	// 30 because of snapping + 5 for other inaccuracies
	expect(Math.abs(centerX - x)).toBeLessThan(35);
	expect(Math.abs(centerY - y)).toBeLessThan(35);
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

/** Mocks the clipboard for webkit by saving the clipboard to the `page` object and overwriting the websites `navigator.clipboard` object
 *
 * This is necessary because webkit doesn't play nicely with clipboard permissions with playwright
 */
export async function mockWebkitClipboard(
	page: Page,
	browserName: string,
	clipboard: MockClipboard,
) {
	if (browserName === "webkit") {
		// These persist even after page reloads
		await page.exposeFunction("playwrightReadClipboard", () => {
			return clipboard.content;
		});
		await page.exposeFunction("playwrightWriteClipboard", (text: string) => {
			clipboard.content = text;
		});

		const mockClipboard = async () => {
			const clipboard = {
				writeText: async (text: string) => {
					await (window as any).playwrightWriteClipboard(text);
				},
				readText: async () => {
					return await (window as any).playwrightReadClipboard();
				},
			};
			Object.defineProperty(navigator, "clipboard", {
				value: clipboard,
			});
		};
		await page.addInitScript(mockClipboard);
	}
}

/**
 * Receives a selector of the form `type:id`
 * and returns all handles with that id that are part of a component with that type.
 * NOTE: If a handle with that id can't be found on a component with that type,
 * it will return `null` for that component.
 */
const createHandleSelectorEngine = () => ({
	/** Returns ids of all components with the specified type */
	getComponents(root: Element, type: string) {
		// Find all components with the specified type, and extract their ids
		return Array.from(
			root.querySelectorAll(
				`.component-body[data-testcomponenttype="${type}"]`,
			),
		).map((e) => e.getAttribute("data-testcomponentid"));
	},
	/** Returns all handles with the specified identifier
	 * for all components specified */
	getHandles(root: Element, componentIds: string[], handleId: string) {
		// For each component id, try finding a handle with the specified `handleId`
		// and the component id, or, if it doesn't exist, use `null`.
		return componentIds.map((id) =>
			root.querySelector(
				`[data-testcomponentid="${id}"][data-testhandleid="${handleId}"]`,
			),
		);
	},
	query(root: Element, selector: string) {
		this.queryAll(root, selector)[0];
	},
	queryAll(root: Element, selector: string) {
		const [type, id, nth] = selector.split(":");

		// Find all components with the specified type
		const ids: (string | null)[] = this.getComponents(root, type);
		// Get the handles for each component
		const handles = this.getHandles(root, ids, id);

		const handle = handles[parseInt(nth)];

		return handle ? [handle] : [];
	},
});
const createComponentSelectorEngine = () => ({
	query(root: Element, selector: string) {
		this.queryAll(root, selector)[0];
	},
	queryAll(root: Element, selector: string) {
		const [type, nth] = selector.split(":");

		const components = Array.from(
			root.querySelectorAll(
				`.component-body[data-testcomponenttype="${type}"]`,
			),
		);

		const component = components[parseInt(nth)];

		return component ? [component] : [];
	},
});

type MockClipboard = {
	content: string;
};

export const test = base.extend<
	{
		page: Page;
		clipboard: MockClipboard;
		editor: Editor;
		editorMobile: Editor;
		touchscreen: Touchscreen;
		/** A default pointer used by the editor */
		pointer: Pointer;
	},
	{ selectorRegistration: void }
>({
	selectorRegistration: [
		async ({ playwright }, use) => {
			await playwright.selectors.register("handle", createHandleSelectorEngine);
			await playwright.selectors.register(
				"component",
				createComponentSelectorEngine,
			);
			await use();
		},
		{ scope: "worker", auto: true },
	],
	clipboard: async ({}, use) => {
		const clipboard = {
			content: "",
		};
		await use(clipboard);
	},
	page: async ({ baseURL, page, browserName, context, clipboard }, use) => {
		if (baseURL === undefined) {
			throw new Error("baseURL is not defined");
		}

		await context.clearCookies();
		throwOnConsoleError(page);
		await mockWebkitClipboard(page, browserName, clipboard);

		await page.goto(baseURL);
		await page.waitForLoadState("networkidle");
		await use(page);
	},
	touchscreen: async ({ page }, use) => {
		const touchscreen = new Touchscreen(page);
		await touchscreen.init();
		await use(touchscreen);
	},
	pointer: async ({ page, hasTouch, touchscreen }, use) => {
		if (hasTouch) {
			const pointer = await touchscreen.createPointer();
			await use(pointer);
			await touchscreen.deletePointer(pointer);
		} else {
			// Only one pointer is needed for desktop
			await use(new DesktopPointer(page));
		}
	},
	editor: async ({ page, pointer }, use) => {
		await use(new Editor(page, pointer));
	},
});

export const expect = baseExpect.extend({
	/** Passes when the component has the correct stroke color for a powered component */
	async toBePowered(locator: Locator, options?: { timeout?: number }) {
		const assertionName = "toBePowered";
		let pass: boolean;
		let matcherResult: MatcherReturnType | undefined;
		try {
			// This custom assertion is actually just a shorthand for the toHaveAttribute assertion
			const expect = this.isNot ? baseExpect(locator).not : baseExpect(locator);
			await expect.toHaveAttribute(
				"stroke",
				"var(--component-delete-color)",
				options,
			);
			pass = true;
			matcherResult = undefined;
		} catch (e) {
			// If the assertion failed, we need to catch the error and set pass to false
			pass = false;
			matcherResult = e.matcherResult;
		}

		const message = pass
			? () => "idk what to put here"
			: () =>
					this.utils.matcherHint(assertionName, undefined, undefined, {
						isNot: this.isNot,
					}) +
					"\n\n" +
					`Locator: ${locator}\n` +
					(matcherResult
						? `Expected: ${this.utils.printExpected((this.isNot ? "not " : "") + matcherResult.expected)}\n` +
							`Received: ${this.utils.printReceived(matcherResult.actual)}`
						: "");

		// if `this.isNot` is true, then we need to return
		// pass: false if the assertion passed
		const passReturnValue = pass !== this.isNot;

		return {
			message,
			pass: passReturnValue,
			name: assertionName,
			expected: matcherResult?.expected,
			actual: matcherResult?.actual,
		};
	},
});

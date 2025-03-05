import {
	test as base,
	expect as baseExpect,
	ExpectMatcherState,
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
				`.canvasWrapper [data-testcomponenttype="${type}"]`,
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
				`.canvasWrapper [data-testconnectedcomponentid="${id}"][data-testhandleid="${handleId}"]`,
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
				`.canvasWrapper [data-testcomponenttype="${type}"]`,
			),
		);

		const component = components[parseInt(nth)];

		return component ? [component] : [];
	},
});

export type MockClipboard = {
	content: string;
};

export const test = base.extend<
	{
		page: Page;
		clipboard: MockClipboard;
		editor: Editor;
		touchscreen: Touchscreen | null;
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
	touchscreen: async ({ page, hasTouch }, use) => {
		if (!hasTouch) {
			await use(null);
			return;
		}
		const touchscreen = new Touchscreen(page);
		await touchscreen.init();
		await use(touchscreen);
	},
	pointer: async ({ page, hasTouch, touchscreen }, use) => {
		if (hasTouch) {
			const pointer = await touchscreen!.createPointer();
			await use(pointer);
			await touchscreen!.deletePointer(pointer);
		} else {
			// Only one pointer is needed for desktop
			await use(new DesktopPointer(page));
		}
	},
	editor: async ({ page, pointer }, use) => {
		await use(new Editor(page, pointer));
	},
});

/**A matcher function.
 * A matcher function will be used like this:
 * ```
 * expect(obj).myMatcherFunction(arg1, arg2)
 * ```
 *
 * The object that is being tested is passed as the `received` argument.
 *
 * All following arguments are passed as arguments to the matcher function.
 * These are represented as `...args` with the type `TArgs` (which defines any kind of array).
 *
 * Additionally, a MatcherFunction usually returns a MatcherReturnType, but this
 * has been abstracted away to allow for more flexibility.
 *
 * The `this` context is an instance of `ExpectMatcherState` which is used to provide
 * useful utilities for the matcher function.
 *
 * @param TReceived The type of the object that is being tested
 * @param TArgs The type of the arguments that the matcher function takes
 * @param ReturnType The return type of the matcher function
 */
type MatcherFunction<
	TReceived extends unknown,
	TArgs extends unknown[],
	ReturnType,
> = (
	this: ExpectMatcherState,
	received: TReceived,
	...args: TArgs
) => Promise<ReturnType>;

/**Creates a matcher function that can be used with the `expect` function.
 *
 * To save time writing boilerplate code, this function takes a simple matcher function
 * that just needs to throw an error if the assertion fails (eg. by calling a builtin matcher function
 * using `expect`), and wraps it to return the proper values and messages.
 *
 * ### Type parameters:
 * @param TReceived The type of the object that the matcher function can receive
 * @param TArgs A type of an array of arguments that the matcher function should receive
 *
 * ### Arguments:
 * @param assertionName The name of the new assertion function
 * @param toString A function that converts the received object to a string
 * @param matcher The simple matcher function that should be wrapped
 * @returns A new matcher function that can be used with `expect` and returns the proper values and messages
 */
const createMatcher = <TReceived extends unknown, TArgs extends unknown[]>(
	assertionName: string,
	toString: (received: TReceived) => string,
	matcher: MatcherFunction<TReceived, TArgs, void>,
): MatcherFunction<TReceived, TArgs, MatcherReturnType> => {
	return async function (this, received, ...args) {
		let pass: boolean;
		let matcherResult: MatcherReturnType | undefined;
		try {
			await matcher.call(this, received, ...args);
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
					`${toString(received)}\n` +
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
	};
};

export const expect = baseExpect.extend({
	/** Passes when the component has the correct stroke color for a powered component */
	toBePowered: createMatcher(
		"toBePowered",
		(l: Locator) => `Locator: ${l}`,
		async function (locator: Locator, options?: { timeout?: number }) {
			const expect = this.isNot ? baseExpect(locator).not : baseExpect(locator);
			await expect.toHaveAttribute(
				"stroke",
				"var(--component-delete-color)",
				options,
			);
		},
	),
	toHaveMode: createMatcher(
		"toHaveMode",
		(p: Page) => `Page: ${p.url()}`,
		async function (page: Page, mode: string, options?: { timeout?: number }) {
			const modeButton = page.getByRole("button", {
				name: `Switch to ${mode} mode`,
			});
			const expect = this.isNot
				? baseExpect(modeButton).not
				: baseExpect(modeButton);
			await expect.toHaveAttribute("aria-pressed", "true", options);
		},
	),
	/** Passes when the sidebar is expanded */
	toBeExpanded: createMatcher(
		"toBeExpanded",
		(l: Locator) => `Locator: ${l}`,
		async function (locator: Locator, options?: { timeout?: number }) {
			const content = locator.locator(".sidebar-content");
			const expect = this.isNot ? baseExpect(content).not : baseExpect(content);
			await expect.not.toHaveClass(/collapsed/, options);
		},
	),
	/** Passes when the sidebar is collapsed */
	toBeCollapsed: createMatcher(
		"toBeCollapsed",
		(l: Locator) => `Locator: ${l}`,
		async function (locator: Locator, options?: { timeout?: number }) {
			const content = locator.locator(".sidebar-content");
			const expect = this.isNot ? baseExpect(content).not : baseExpect(content);
			await expect.toHaveClass(/collapsed/, options);
		},
	),
	/** Passes when the component has the correct stroke color for a selected component */
	toBeSelected: createMatcher(
		"toBeSelected",
		(l: Locator) => `Locator: ${l}`,
		async function (locator: Locator, options?: { timeout?: number }) {
			const expect = this.isNot ? baseExpect(locator).not : baseExpect(locator);
			await expect.toHaveClass(/selected/, options);
		},
	),
	toBeRotated: createMatcher(
		"toBeRotated",
		(l: Locator) => `Locator: ${l}`,
		async function (
			locator: Locator,
			degrees: number,
			options?: { timeout?: number },
		) {
			const expect = this.isNot ? baseExpect(locator).not : baseExpect(locator);
			await expect.toHaveAttribute(
				"transform",
				new RegExp(`rotate\\(${degrees}`),
				options,
			);
		},
	),

	/** Passes when the given locator is centered at the given position */
	toBeAt: createMatcher(
		"toBeAt",
		(l: Locator) => `Locator: ${l}`,
		async function (
			locator: Locator,
			x: number,
			y: number,
			options?: {
				timeout?: number;
			},
		) {
			const boundingBox = (await locator.boundingBox())!;
			expect(boundingBox).not.toBeNull();
		
			const centerX = boundingBox.x + boundingBox.width / 2;
			const centerY = boundingBox.y + boundingBox.height / 2;
		
			// 30 because of snapping + 5 for other inaccuracies
			expect(Math.abs(centerX - x)).toBeLessThan(35);
			expect(Math.abs(centerY - y)).toBeLessThan(35);
		},
	),
});

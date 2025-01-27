import { Locator, Page } from "@playwright/test";
import { Touchscreen } from "./mobile/touchscreen";

export abstract class BaseEditor {
	constructor(protected readonly page: Page) {}

	getHandle(type: string, id: string) {
		// relay over to selector engine
		return {
			nth: (n: number) => this.page.locator(`handle=${type}:${id}:${n}`),
			first: () => this.page.locator(`handle=${type}:${id}:0`),
		};
	}

	getComponent(type: string) {
		return {
			nth: (n: number) => this.page.locator(`component=${type}:${n}`),
			first: () => this.page.locator(`component=${type}:0`),
		};
	}

	comp() {
		return this.page.locator(".component-body");
	}
}

export interface Editor {
	/**
	 * Returns a custom locator for all handles (or the nth) with a specific identifier
	 * that belong to a component with the specified type.
	 * @param type The type of the component (eg. "AND")
	 * @param id The identifier of the handle (eg. "out" or "in1")
	 *
	 * Important note for returned methods:
	 * You select the nth **component**, not handle
	 * This means that if you pass type="AND", id="in1", n=0, but the first AND gate
	 * has the "in1" gate hidden, **it will return null** instead of selecting the second AND gate.
	 */
	getHandle(
		type: string,
		id: string,
	): { nth: (n: number) => Locator; first: () => Locator };

	/** Returns a custom locator for all components with the specified type */
	getComponent(type: string): {
		nth: (n: number) => Locator;
		first: () => Locator;
	};

	/** Adds a component with the specified type at the specified location */
	addComponent(type: string, x: number, y: number): Promise<void>;

	/** Returns a locator matching all components currently in the editor */
	comp(): Locator;

	/* Connects two handles with each other */
	connect(handle1: Locator, handle2: Locator): Promise<void>;

	/** Drags a locator to a specific position */
	drag(locator: Locator, x: number, y: number): Promise<void>;

	toggleSimulate(): Promise<void>;
}

export class DesktopEditor extends BaseEditor implements Editor {
	addComponent(type: string, x: number, y: number): Promise<void> {
		throw new Error("Method not implemented.");
	}
	connect(handle1: Locator, handle2: Locator): Promise<void> {
		throw new Error("Method not implemented.");
	}
	drag(locator: Locator, x: number, y: number): Promise<void> {
		throw new Error("Method not implemented.");
	}
	toggleSimulate(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}

export class MobileEditor extends BaseEditor implements Editor {
	constructor(
		page: Page,
		private readonly touchscreen: Touchscreen,
	) {
		super(page);
	}

	async addComponent(type: string, x: number, y: number): Promise<void> {
		const pointer = await this.touchscreen!.createPointer();
		await this.page
			.locator(".sidebarWrapper")
			.getByText(type, { exact: true })
			.click();
		await pointer.tap(x, y);
	}
	async connect(handle1: Locator, handle2: Locator): Promise<void> {
		const pointer = await this.touchscreen!.createPointer();
		await pointer.downOn(handle1);
		await pointer.moveTo(handle2);
		await pointer.up();
	}
	async drag(locator: Locator, x: number, y: number): Promise<void> {
		const pointer = await this.touchscreen!.createPointer();
		await pointer.downOn(locator);
		await pointer.move(x, y);
		await pointer.up();
	}
	async toggleSimulate(): Promise<void> {
		await this.page.getByRole("button", { name: "Toggle Simulation" }).click();
	}
}

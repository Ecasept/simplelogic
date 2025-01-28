import { Locator, Page } from "@playwright/test";
import { Touchscreen } from "./mobile/touchscreen";

/** Base Editor class implementing functions independent of the page being mobile or not */
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

	/** Toggles the simulation mode on the page */
	toggleSimulate(): Promise<void>;
}

export class DesktopEditor extends BaseEditor implements Editor {
	async addComponent(type: string, x: number, y: number): Promise<void> {
		await this.page
			.locator(".sidebarWrapper")
			.getByText(type, { exact: true })
			.click();
		await this.page.mouse.click(x, y);
	}
	async connect(handle1: Locator, handle2: Locator): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async drag(locator: Locator, x: number, y: number): Promise<void> {
		throw new Error("Method not implemented.");
	}
	async toggleSimulate(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}

export class MobileEditor extends BaseEditor implements Editor {
	constructor(
		page: Page,
		private readonly touchscreen: Touchscreen,
		private readonly pointer: Pointer,
	) {
		super(page);
	}

	async addComponent(type: string, x: number, y: number): Promise<void> {
		await this.pointer.clickOn(
			this.page.locator(".sidebarWrapper").getByText(type, { exact: true }),
		);
		await this.pointer.clickAt(x, y);
	}
	async connect(handle1: Locator, handle2: Locator): Promise<void> {
		await this.pointer.downOn(handle1);
		await this.pointer.moveOnto(handle2);
		await this.pointer.up();
	}
	async drag(locator: Locator, x: number, y: number): Promise<void> {
		await this.pointer.downOn(locator);
		await this.pointer.moveTo(x, y);
		await this.pointer.up();
	}
	async toggleSimulate(): Promise<void> {
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Toggle Simulation" }),
		);
	}
}

export interface Pointer {
	/** Press the pointer at the current coordinates */
	down(options?: { button: "right" }): Promise<void>;

	/** Release the pointer */
	up(): Promise<void>;

	/** Move the pointer to the specified coordinates */
	moveTo(x: number, y: number): Promise<void>;

	/** Press the pointer at the specified coordinates */
	downAt(x: number, y: number): Promise<void>;

	/** Press and then release the pointer at the specified coordinates */
	clickAt(x: number, y: number): Promise<void>;

	/** Press the pointer on the specified locator */
	downOn(locator: Locator): Promise<void>;

	/** Move the pointer to the specified locator */
	moveOnto(locator: Locator): Promise<void>;

	/** Press and then release the pointer on the specified locator */
	clickOn(locator: Locator): Promise<void>;
}

export class DesktopPointer implements Pointer {
	constructor(private readonly page: Page) {}

	async down(options: { button: "right" }) {
		await this.page.mouse.down(options);
	}

	async up() {
		await this.page.mouse.up();
	}

	async moveTo(x: number, y: number) {
		await this.page.mouse.move(x, y);
	}

	async downAt(x: number, y: number) {
		await this.page.mouse.move(x, y);
		await this.page.mouse.down();
	}

	async clickAt(x: number, y: number) {
		await this.page.mouse.click(x, y);
	}

	async downOn(locator: Locator) {
		await locator.hover();
		await this.page.mouse.down();
	}

	async moveOnto(locator: Locator) {
		await locator.hover();
	}

	async clickOn(locator: Locator) {
		await locator.click();
	}
}

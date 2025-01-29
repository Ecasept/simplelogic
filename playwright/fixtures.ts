import { Locator, Page } from "@playwright/test";

/** Base Editor class implementing functions independent of the page being mobile or not */
export class Editor {
	constructor(
		protected readonly page: Page,
		protected readonly pointer: Pointer,
	) {}

	/** Reloads the editor, resetting all components and everyhing else in the UI */
	async reload() {
		await this.page.goto("/");
		await this.page.waitForLoadState("networkidle");
	}

	async undo() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Undo" }));
	}

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
	getHandle(type: string, id: string) {
		// relay over to selector engine
		return {
			nth: (n: number) => this.page.locator(`handle=${type}:${id}:${n}`),
			first: () => this.page.locator(`handle=${type}:${id}:0`),
		};
	}

	/** Returns a custom locator for all components with the specified type */
	getComponent(type: string) {
		return {
			nth: (n: number) => this.page.locator(`component=${type}:${n}`),
			first: () => this.page.locator(`component=${type}:0`),
		};
	}

	/** Returns a locator matching all components currently in the editor */
	comp() {
		return this.page.locator(".component-body");
	}

	/** Adds a component with the specified type at the specified location */
	async addComponent(type: string, x: number, y: number): Promise<void> {
		await this.pointer.clickOn(
			this.page.locator(".sidebarWrapper").getByText(type, { exact: true }),
		);
		await this.pointer.clickAt(x, y);
	}

	/* Drags one locator to another locator */
	async drag(src: Locator, dst: Locator): Promise<void> {
		await this.pointer.downOn(src);
		await this.pointer.moveOnto(dst);
		await this.pointer.up();
	}

	/** Drags a locator to the specified coordinates */
	async dragTo(src: Locator, x: number, y: number): Promise<void> {
		await this.pointer.downOn(src);
		await this.pointer.moveTo(x, y);
		await this.pointer.up();
	}

	/** Toggles the simulation mode on the page */
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

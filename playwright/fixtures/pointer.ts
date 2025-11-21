import { Locator, Page } from "@playwright/test";

export interface Pointer {
	down(options?: { button: "right" }): Promise<void>;
	up(): Promise<void>;
	moveTo(x: number, y: number): Promise<void>;
	downAt(x: number, y: number): Promise<void>;
	clickAt(x: number, y: number): Promise<void>;
	downOn(locator: Locator, force?: boolean): Promise<void>;
	moveOnto(locator: Locator, force?: boolean): Promise<void>;
	clickOn(locator: Locator, force?: boolean): Promise<void>;
}

export class DesktopPointer implements Pointer {
	constructor(private readonly page: Page) { }

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

	async downOn(locator: Locator, force?: boolean) {
		await locator.hover({ force });
		await this.page.mouse.down();
	}

	async moveOnto(locator: Locator, force?: boolean) {
		await locator.hover({ force });
	}

	async clickOn(locator: Locator, force?: boolean) {
		await locator.click({ force });
	}
}

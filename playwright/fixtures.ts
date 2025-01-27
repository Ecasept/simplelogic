import { Locator, Page } from "@playwright/test";
import { Touchscreen } from "./mobile/touchscreen";

export class Editor {
	constructor(
		private readonly page: Page,
		private readonly isMobile: boolean,
		private readonly touchscreen?: Touchscreen,
	) {
		if (isMobile && touchscreen === undefined) {
			throw new Error("Touchscreen must be provided for mobile tests");
		}
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

	/** Adds a component with the specified type at the specified location */
	async addComponent(type: string, x: number, y: number) {
		if (this.isMobile) {
			const pointer = await this.touchscreen!.createPointer();
			await this.page
				.locator(".sidebarWrapper")
				.getByText(type, { exact: true })
				.click();
			await pointer.tap(x, y);
		} else {
			throw new Error("Not implemented");
		}
	}

	/** Returns a locator matching all components currently in the editor */
	comp() {
		return this.page.locator(".component-body");
	}

	/* Connects two handles with each other */
	async connect(handle1: Locator, handle2: Locator) {
		if (this.isMobile) {
			const pointer = await this.touchscreen!.createPointer();
			await pointer.downOn(handle1);
			await pointer.moveTo(handle2);
			await pointer.up();
		} else {
			throw new Error("Not implemented");
		}
	}

	/** Drags a locator to a specific position */
	async drag(locator: Locator, x: number, y: number) {
		if (this.isMobile) {
			const pointer = await this.touchscreen!.createPointer();
			await pointer.downOn(locator);
			await pointer.move(x, y);
			await pointer.up();
		} else {
			throw new Error("Not implemented");
		}
	}

	async toggleSimulate() {
		await this.page.getByRole("button", { name: "Toggle Simulation" }).click();
	}
}

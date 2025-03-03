import { Locator, Page } from "@playwright/test";
import { expect } from "./common";

type SidebarUniqueName = "tools" | "selection";

/** Base Editor class implementing functions independent of the page being mobile or not */
export class Editor {
	constructor(
		private readonly page: Page,
		private readonly pointer: Pointer,
	) {}

	/** Reloads the editor, resetting all components and everyhing else in the UI */
	async reload() {
		await this.page.goto("/");
		await this.page.waitForLoadState("networkidle");
	}

	/** Expand/collapse the specified sidebar */
	async toggleSidebar(uniqueName: SidebarUniqueName) {
		const button = this.page.locator(
			`[aria-controls="sidebar-${uniqueName}-content"]`,
		);
		const expanded = await button.getAttribute("aria-expanded");
		await button.click();
		const sidebar = this.getSidebar(uniqueName);
		if (expanded === "true") {
			await expect(sidebar).toBeCollapsed();
		} else {
			await expect(sidebar).toBeExpanded();
		}
	}
	/** Returns a locator to the specified sidebar */
	getSidebar(uniqueName: SidebarUniqueName) {
		return this.page.locator(`#sidebar-${uniqueName}`);
	}

	async deleteSelected() {
		const button = this.getSidebar("selection").getByRole("button", {
			name: "Delete",
		});
		await this.pointer.clickOn(button);
	}

	/** Clicks the toggle delete button */
	async toggleDelete() {
		const button = this.page.getByLabel("Switch to delete mode");
		// get aria pressed
		const ariaPressed = await button.getAttribute("aria-pressed");
		if (ariaPressed === "false") {
			await this.setMode("delete");
		} else {
			await this.setMode("edit");
		}
		await expect(this.page).toHaveMode("delete");
	}

	/** Clicks the component toolbar toggle */
	async toggleComponentToolbar() {
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Show components" }),
		);
	}

	async undo() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Undo" }));
	}

	async deleteWire(locator: Locator) {
		// Wires have a separate hitbox which intercepts the click
		// so we need to force the click so playwright doesn't wait
		// for the actual wire to be clicked.
		return this.delete(locator, true);
	}

	async delete(locator: Locator, force?: boolean) {
		await this.setMode("delete");
		await this.pointer.clickOn(locator, force);
		await this.setMode("edit");
	}

	async loadCircuit(circuit: string) {
		await this.page.evaluate((text) => {
			return navigator.clipboard.writeText(text);
		}, circuit);

		await this.pointer.clickOn(this.page.getByRole("button", { name: "Load" }));
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Paste from clipboard" }),
		);
	}

	async waitForSimulationFinished() {
		console.warn("waitForSimulationFinished is not implemented, using timeout");
		await this.page.waitForTimeout(1000);
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
	comps() {
		return this.page.locator(".canvasWrapper .component-body");
	}

	/** Returns a locator matching all wires currently in the editor */
	wires() {
		return this.page.locator(".canvasWrapper .wire");
	}

	/** **DEPRECATED**: Use `editor.getHandle()` instead
	 *
	 * Returns a locator matching all handles currently in the editor */
	handles() {
		return this.page.locator(".canvasWrapper .handle");
	}

	async initiateAddComponent(type: string) {
		await this.pointer.downOn(this.page.getByLabel(`Add ${type}`));
	}

	/** Adds a component with the specified type at the specified location */
	async addComponent(type: string, x: number, y: number): Promise<void> {
		await this.initiateAddComponent(type);
		await this.pointer.moveTo(x, y);
		await this.pointer.up();
	}

	/* Drags one locator to another locator */
	async drag(src: Locator, dst: Locator, force?: boolean): Promise<void> {
		await this.pointer.downOn(src, force);
		await this.pointer.moveOnto(dst, force);
		await this.pointer.up();
	}

	/** Drags a locator to the specified coordinates without releasing the pointer */
	async dragToNoRelease(
		src: Locator,
		x: number,
		y: number,
		force?: boolean,
	): Promise<void> {
		await this.pointer.downOn(src, force);
		await this.pointer.moveTo(x, y);
	}

	/** Drags a locator to the specified coordinates */
	async dragTo(
		src: Locator,
		x: number,
		y: number,
		force?: boolean,
	): Promise<void> {
		await this.dragToNoRelease(src, x, y, force);
		await this.pointer.up();
	}

	/** Toggles the simulation mode on the page */
	async toggleSimulate(): Promise<void> {
		const simulateButton = this.page.getByLabel("Switch to simulate mode");
		const ariaPressed = await simulateButton.getAttribute("aria-pressed");
		if (ariaPressed === "false") {
			await this.setMode("simulate");
		} else {
			await this.setMode("edit");
		}
	}

	async setMode(mode: "edit" | "delete" | "simulate") {
		const button = this.page.getByLabel(`Switch to ${mode} mode`);
		expect(await button.getAttribute("aria-pressed")).toBe("false");
		await this.pointer.clickOn(button);
		await expect(this.page).toHaveMode(mode);
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
	downOn(locator: Locator, force?: boolean): Promise<void>;

	/** Move the pointer to the specified locator */
	moveOnto(locator: Locator, force?: boolean): Promise<void>;

	/** Press and then release the pointer on the specified locator */
	clickOn(locator: Locator, force?: boolean): Promise<void>;
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

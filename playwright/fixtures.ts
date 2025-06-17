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

	getNameInput() {
		return this.getModal().getByPlaceholder("Enter a descriptive name");
	}

	getSaveButton() {
		return this.getModal().getByRole("button", { name: "Save online" });
	}

	getLoadButton() {
		return this.getModal().getByRole("button", { name: "Load saved circuits" });
	}

	async closeModal() {
		await this.getModal().getByRole("button", { name: "Close" }).click();
		await expect(this.getModal()).not.toBeVisible();
	}

	getModal() {
		return this.page.locator(".modal-bg");
	}

	async clickGoogleLoginButton() {
		const button = this.page.getByRole("button", {
			name: "Continue with Google",
		});
		await expect(button).toBeVisible();
		await button.click();
		await expect(button).not.toBeVisible();
		await this.page.waitForURL("/");
		await this.page.waitForLoadState("networkidle");
	}

	async openLoadModal() {
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Load circuit" }),
		);
	}

	async openSaveModal() {
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Save circuit" }),
		);
	}

	async signIn() {
		await this.toggleAccountButton();
		await this.clickGoogleLoginButton();
	}

	async signOut() {
		await this.toggleAccountButton();
		const btn = this.page.getByRole("button", { name: "Sign out" });
		await btn.click();
		await expect(btn).not.toBeVisible();
		await this.page.waitForURL("/");
		await this.page.waitForLoadState("networkidle");
	}

	/** Returns a locator to the account menu that is opened by the account button */
	getAccountMenu() {
		return this.page.locator("#auth-popup");
	}

	/** Clicks the user button in the header */
	async toggleAccountButton() {
		const button = this.page.getByRole("button", { name: "Open account menu" });
		const popup = this.getAccountMenu();
		if (await popup.isVisible()) {
			await button.click();
			await expect(popup).not.toBeVisible();
		} else {
			await button.click();
			await expect(popup).toBeVisible();
		}
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
		const button = this.page.getByRole("button", {
			name: "Switch to delete mode",
		});
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

	/** Loads `circuit` using the clipboard functionality */
	async loadCircuitUsingClipboard(circuit: string) {
		await this.page.evaluate((text) => {
			return navigator.clipboard.writeText(text);
		}, circuit);

		await this.openLoadModal();
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Paste from clipboard" }),
		);
	}

	/** Saves the current circuit to the clipboard and returns the circuit data as a string */
	async saveCircuitUsingClipboard() {
		await this.openSaveModal();
		await this.pointer.clickOn(
			this.page.getByRole("button", { name: "Copy to clipboard" }),
		);
		const text = await this.page.evaluate(() => {
			return navigator.clipboard.readText();
		});
		return text;
	}

	async waitForSimulationFinished() {
		await expect(this.page.getByText("Processing...")).not.toBeVisible();
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
	 * has the "in1" gate hidden, **the locator won't resolve** instead of selecting the second AND gate.
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
		const simulateButton = this.page.getByRole("button", {
			name: "Switch to simulate mode",
		});
		const ariaPressed = await simulateButton.getAttribute("aria-pressed");
		if (ariaPressed === "false") {
			await this.setMode("simulate");
		} else {
			await this.setMode("edit");
		}
	}

	async setMode(mode: "edit" | "delete" | "simulate") {
		const button = this.page.getByRole("button", {
			name: `Switch to ${mode} mode`,
		});
		expect(await button.getAttribute("aria-pressed")).toBe("false");
		await this.pointer.clickOn(button);
		await expect(this.page).toHaveMode(mode);
	}

	async setGridSnap(enable: boolean) {
		const text = enable ? "Enable grid snap" : "Disable grid snap";
		await this.pointer.clickOn(this.page.getByLabel(text));
	}

	async rotateSelected(dir: "cw" | "ccw") {
		const dirText = dir === "cw" ? "clockwise" : "counter-clockwise";
		const button = this.page.getByRole("button", { name: `Rotate ${dirText}` });
		await this.pointer.clickOn(button);
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

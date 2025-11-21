import { Locator, Page } from "@playwright/test";
import { expect } from "../common";
import type { Pointer } from "./pointer";

type SidebarUniqueName = "tools" | "selection";

export class Editor {
	constructor(
		private readonly page: Page,
		private readonly pointer: Pointer,
		private readonly browserName: string,
		private readonly baseURL: string,
	) { }

	async waitForNetworkIdle() {
		if (this.browserName !== "firefox" || process.env.CI) {
			await this.page.waitForLoadState("networkidle");
		}
	}

	async reload() {
		await this.page.goto(this.baseURL);
		await this.waitForNetworkIdle();
	}

	async ctrlSelect(locator: Locator, force?: boolean) {
		await this.page.keyboard.down("Control");
		await this.pointer.clickOn(locator, force);
		await this.page.keyboard.up("Control");
	}

	async deleteCircuit(name: string) {
		const entry = this.getModal().getByRole("menuitem", { name, exact: true });
		await entry.getByRole("button", { name: "Delete circuit" }).click();
		await expect(entry).not.toBeVisible();
	}

	async saveAs(name: string) {
		await this.openSaveModal();
		await this.getNameInput().fill(name);
		await this.getSaveButton().click();
		await expect(this.getModal().getByText("Circuit saved")).toBeVisible();
		await this.closeModal();
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
		const button = this.page.getByRole("button", { name: "Continue with Google" });
		await expect(button).toBeVisible();
		await button.click();
		await expect(button).not.toBeVisible();
		await this.page.waitForURL(this.baseURL);
		await this.waitForNetworkIdle();
	}
	async openLoadModal() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Load circuit" }));
		await expect(this.getModal()).toBeVisible();
	}
	async openSaveModal() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Save circuit" }));
		await expect(this.getModal()).toBeVisible();
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
		await this.page.waitForURL(this.baseURL);
		await this.waitForNetworkIdle();
	}
	getAccountMenu() {
		return this.page.locator("#auth-popup");
	}
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

	async toggleSidebar(uniqueName: SidebarUniqueName) {
		const button = this.page.locator(`[aria-controls="sidebar-${uniqueName}-content"]`);
		const expanded = await button.getAttribute("aria-expanded");
		await button.click();
		const sidebar = this.getSidebar(uniqueName);
		if (expanded === "true") {
			await expect(sidebar).toBeCollapsed();
		} else {
			await expect(sidebar).toBeExpanded();
		}
	}
	getSidebar(uniqueName: SidebarUniqueName) {
		return this.page.locator(`#sidebar-${uniqueName}`);
	}

	async deleteSelected() {
		const button = this.getSidebar("selection").getByRole("button", { name: "Delete" });
		await this.pointer.clickOn(button);
	}
	async toggleDelete() {
		const button = this.page.getByRole("button", { name: "Switch to delete mode" });
		const ariaPressed = await button.getAttribute("aria-pressed");
		if (ariaPressed === "false") {
			await this.setMode("delete");
		} else {
			await this.setMode("edit");
		}
		await expect(this.page).toHaveMode("delete");
	}
	async toggleComponentToolbar() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Show components" }));
	}
	async undo() {
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Undo" }));
	}

	async deleteWire(locator: Locator) {
		return this.delete(locator, true);
	}
	async delete(locator: Locator, force?: boolean) {
		await this.setMode("delete");
		await this.pointer.clickOn(locator, force);
		await this.setMode("edit");
	}

	async loadCircuitUsingClipboard(circuit: string) {
		await this.page.evaluate((text) => navigator.clipboard.writeText(text), circuit);
		await this.openLoadModal();
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Paste from clipboard" }));
		await this.closeModal();
	}
	async saveCircuitUsingClipboard() {
		await this.openSaveModal();
		await this.pointer.clickOn(this.page.getByRole("button", { name: "Copy to clipboard" }));
		const text = await this.page.evaluate(() => navigator.clipboard.readText());
		await this.closeModal();
		return text;
	}

	getHandle(type: string, id: string) {
		return { nth: (n: number) => this.page.locator(`handle=${type}:${id}:${n}`), first: () => this.page.locator(`handle=${type}:${id}:0`) };
	}
	getComponent(type: string) {
		return { nth: (n: number) => this.page.locator(`component=${type}:${n}`), first: () => this.page.locator(`component=${type}:0`) };
	}
	comps() { return this.page.locator(".canvasWrapper .component-body"); }
	wires() { return this.page.locator(".canvasWrapper .wire"); }
	handles() { return this.page.locator(".canvasWrapper .handle"); }

	async initiateAddComponent(type: string) {
		await this.pointer.downOn(this.page.getByLabel(`Add ${type}`));
	}
	async addComponent(type: string, x: number, y: number): Promise<void> {
		await this.initiateAddComponent(type);
		await this.pointer.moveTo(x, y);
		await this.pointer.up();
	}
	async drag(src: Locator, dst: Locator, force?: boolean): Promise<void> {
		await this.pointer.downOn(src, force);
		await this.pointer.moveOnto(dst, force);
		await this.pointer.up();
	}
	async dragToNoRelease(src: Locator, x: number, y: number, force?: boolean): Promise<void> {
		await this.pointer.downOn(src, force);
		await this.pointer.moveTo(x, y);
	}
	async dragTo(src: Locator, x: number, y: number, force?: boolean): Promise<void> {
		await this.dragToNoRelease(src, x, y, force);
		await this.pointer.up();
	}

	async toggleSimulate(): Promise<void> {
		const simulateButton = this.page.getByRole("button", { name: "Switch to simulate mode" });
		const ariaPressed = await simulateButton.getAttribute("aria-pressed");
		if (ariaPressed === "false") {
			await this.setMode("simulate");
		} else {
			await this.setMode("edit");
		}
	}
	async setMode(mode: "edit" | "delete" | "simulate") {
		const button = this.page.getByRole("button", { name: `Switch to ${mode} mode` });
		expect(await button.getAttribute("aria-pressed")).toBe("false");
		await this.pointer.clickOn(button);
		await expect(this.page).toHaveMode(mode);
	}
	async setGridSnap(enable: boolean) {
		const text = enable ? "Enable grid snap" : "Disable grid snap";
		await this.pointer.clickOn(this.page.getByLabel(text));
	}
	async setContinuousPlacement(enable: boolean) {
		const enableLabel = "Enable continuous placement";
		const disableLabel = "Disable continuous placement";
		if (enable) {
			const enableButton = this.page.getByRole("button", { name: enableLabel });
			if (await enableButton.isVisible()) {
				await this.pointer.clickOn(enableButton);
			} else {
				await expect(this.page.getByRole("button", { name: disableLabel })).toBeVisible();
			}
			return;
		}
		const disableButton = this.page.getByRole("button", { name: disableLabel });
		if (await disableButton.isVisible()) {
			await this.pointer.clickOn(disableButton);
		} else {
			await expect(this.page.getByRole("button", { name: enableLabel })).toBeVisible();
		}
	}
	async rotateSelected(dir: "cw" | "ccw") {
		const dirText = dir === "cw" ? "clockwise" : "counter-clockwise";
		const button = this.page.getByRole("button", { name: `Rotate ${dirText}` });
		await this.pointer.clickOn(button);
	}
	getSelectedCount() {
		return this.page.locator('.canvasWrapper .selected').count();
	}
}

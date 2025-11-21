import { expect } from "../common";
import { Editor } from "./editor";

export class Simulation {
	constructor(private readonly editor: Editor) { }

	async waitForSimulationFinished() {
		const calc = this.editor.getSidebar("tools").getByText("Calculating...", { exact: false });
		// If visible now, wait for it to disappear; otherwise wait a short grace and check again
		if (await calc.isVisible()) {
			await expect(calc).not.toBeVisible();
			return;
		}
		await (this.editor as any)["page"].waitForTimeout(1000);
		if (await calc.isVisible()) {
			await expect(calc).not.toBeVisible();
		}
	}

	async startContinuous(): Promise<void> {
		const startBtn = this.editor.getSidebar("tools").getByRole("button", { name: "Start" });
		if (await startBtn.isVisible()) {
			await (this.editor as any)["pointer"].clickOn(startBtn);
		}
	}

	async stopContinuous(): Promise<void> {
		const stopBtn = this.editor.getSidebar("tools").getByRole("button", { name: "Stop" });
		if (await stopBtn.isVisible()) {
			await (this.editor as any)["pointer"].clickOn(stopBtn);
		}
	}

	async step(): Promise<void> {
		const stepBtn = this.editor.getSidebar("tools").getByRole("button", { name: "Step Forward" });
		await (this.editor as any)["pointer"].clickOn(stepBtn);
	}

	async setUpdateDelay(ms: number): Promise<void> {
		const slider = this.editor.getSidebar("tools").locator('input[type="range"]');
		await slider.evaluate((el, value) => {
			(el as HTMLInputElement).value = String(value);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, ms);
	}

	async reset(): Promise<void> {
		const resetBtn = this.editor.getSidebar("tools").getByRole("button", { name: "Reset" });
		await (this.editor as any)["pointer"].clickOn(resetBtn);
	}

	async getQueueCount(): Promise<number> {
		const badge = this.editor.getSidebar("tools").getByLabel("items in queue");
		const text = (await badge.textContent())?.trim() ?? "0";
		const n = Number.parseInt(text, 10);
		return Number.isFinite(n) ? n : 0;
	}

	async resetToNonContinuous(): Promise<void> {
		await this.editor.setMode("simulate");
		await this.stopContinuous();
		await this.reset();
		const calc = this.editor.getSidebar("tools").getByText("Calculating...", { exact: false });
		await expect(calc).not.toBeVisible();
	}
}

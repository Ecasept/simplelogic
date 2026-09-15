import { expect, expectPosToBe, test } from "../common";

test("window blur rolls back a drag and a later release cannot commit it", async ({
	page,
	editor,
	pointer,
}) => {
	await editor.addComponent("AND", 300, 300);
	await pointer.downAt(300, 300);
	await pointer.moveTo(500, 400);
	await expectPosToBe(editor.comps(), 500, 400);
	await page.evaluate(() => window.dispatchEvent(new Event("blur")));
	await pointer.up();
	await expectPosToBe(editor.comps(), 300, 300);
	await editor.undo();
	await expect(editor.comps()).toHaveCount(0);
});

test("pointer cancellation restores panning and allows a fresh gesture", async ({
	page,
	editor,
	pointer,
}) => {
	const canvas = page.locator("svg.canvas");
	const original = await canvas.getAttribute("viewBox");
	await canvas.dispatchEvent("pointerdown", {
		pointerId: 10,
		button: 0,
		clientX: 500,
		clientY: 400,
	});
	await canvas.dispatchEvent("pointermove", {
		pointerId: 10,
		clientX: 600,
		clientY: 500,
	});
	await expect(canvas).not.toHaveAttribute("viewBox", original!);
	await canvas.dispatchEvent("pointercancel", { pointerId: 10 });
	await expect(canvas).toHaveAttribute("viewBox", original!);
	await pointer.downAt(500, 400);
	await pointer.moveTo(550, 450);
	await pointer.up();
	await expect(canvas).not.toHaveAttribute("viewBox", original!);
});

test("lost pointer capture cancels an area gesture without clearing selection", async ({
	page,
	editor,
}) => {
	await editor.addComponent("AND", 300, 300);
	const canvas = page.locator("svg.canvas");
	await canvas.dispatchEvent("pointerdown", {
		pointerId: 10,
		button: 0,
		shiftKey: true,
		clientX: 500,
		clientY: 400,
	});
	await canvas.dispatchEvent("pointermove", {
		pointerId: 10,
		clientX: 600,
		clientY: 500,
	});
	await expect(canvas.locator("rect[stroke-dasharray]")).toBeVisible();
	await canvas.dispatchEvent("lostpointercapture", { pointerId: 10 });
	await expect(canvas.locator("rect[stroke-dasharray]")).toHaveCount(0);
	await expect(editor.comps()).toBeSelected();
});

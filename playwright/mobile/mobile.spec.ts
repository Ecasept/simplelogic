import { expect } from "@playwright/test";
import { expectPosToBe, test } from "../common";

test.describe("Mobile", () => {
	test("can edit", async ({ page, editorMobile: editor }) => {
		await editor.addComponent("AND", 100, 100);
		await editor.addComponent("AND", 200, 200);

		await editor.connect(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("AND", "in1").nth(1),
		);

		await editor.drag(editor.comp().first(), 100, 100);

		await expect(page.locator(".wire")).toHaveAttribute(
			"d",
			"M181 141 L241 261",
		);
	});
});

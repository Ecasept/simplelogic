import { expect, test } from "../common";

test.describe("Mobile", () => {
	test("can connect", async ({ page, editorMobile: editor }) => {
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
		await editor.drag(editor.comp().first(), 150, 150);
		await expect(page.locator(".wire")).toHaveAttribute(
			"d",
			"M241 201 L241 261",
		);
	});
	test("build half adder flow", async ({
		editorMobile: editor,
		touchscreen,
	}) => {
		test.skip(true, "// fTODO: find source of bug");
		// Add inputs
		await editor.addComponent("IN", 100, 100);
		await editor.addComponent("IN", 100, 200);

		// Add XOR gate for sum
		await editor.addComponent("XOR", 200, 150);

		// Add AND gate for carry
		await editor.addComponent("AND", 200, 250);

		// Add LED gates for outputs
		await editor.addComponent("LED", 300, 150); // Sum output
		await editor.addComponent("LED", 300, 250); // Carry output

		// Connect inputs to XOR gate
		await editor.connect(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("XOR", "in1").first(),
		);
		await editor.connect(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("XOR", "in2").first(),
		);

		// Connect inputs to AND gate
		await editor.connect(
			editor.getHandle("IN", "out").first(),
			editor.getHandle("AND", "in1").first(),
		);
		await editor.connect(
			editor.getHandle("IN", "out").nth(1),
			editor.getHandle("AND", "in2").first(),
		);

		// Connect XOR output to LED (sum)
		await editor.connect(
			editor.getHandle("XOR", "out").first(),
			editor.getHandle("LED", "in").first(),
		);

		// Connect AND output to LED (carry)
		await editor.connect(
			editor.getHandle("AND", "out").first(),
			editor.getHandle("LED", "in").nth(1),
		);

		editor.toggleSimulate();

		const in1 = editor.getComponent("IN").first();
		const in2 = editor.getComponent("IN").nth(1);
		const sum = editor.getComponent("LED").first();
		const carry = editor.getComponent("LED").nth(1);
		const pointer = touchscreen.createPointer();

		await pointer.tapOn(in1);
		await expect(sum).toBePowered();
	});
});

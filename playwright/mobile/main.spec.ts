import { expectPosToBe, test } from "../common";

test.describe("panning", async () => {
	test("can pan and zoom while moving component", async ({
		editor,
		touchscreen,
		pointer: ptr1,
	}) => {
		const ptr2 = await touchscreen!.createPointer();
		const ptr3 = await touchscreen!.createPointer();

		await editor.addComponent("AND", 100, 100);

		// Drag wire for later
		await ptr1.downOn(editor.getHandle("AND", "out").first());
		await ptr1.moveTo(650, 650);
		await ptr1.up();

		// Start moving component
		await ptr1.downOn(editor.comps().first());

		// pan with second finger
		await ptr2.downAt(600, 600);
		await ptr2.moveTo(500, 500);
		await expectPosToBe(editor.comps().first(), 0, 0);
		await expectPosToBe(editor.getHandle("wire", "output").first(), 550, 550);

		// zoom with third finger so that
		// wire handle is in the middle after moving
		await ptr3.downAt(550, 550);
		await ptr3.moveTo(600, 600);

		// Expect moved handle (which should be at 550, 550 after panning,
		// and therefore exactly between ptr2 and ptr3), to not have moved
		await expectPosToBe(editor.getHandle("wire", "output").first(), 550, 550);

		touchscreen!.deletePointer(ptr2);
		touchscreen!.deletePointer(ptr3);
	});
});

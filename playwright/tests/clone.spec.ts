import { expect, expectPosToBe, test } from "../common";

async function centerOf(locator: Parameters<typeof expectPosToBe>[0]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return {
        x: box!.x + box!.width / 2,
        y: box!.y + box!.height / 2,
    };
}

test.describe("Duplicate and drag (Ctrl+D)", () => {
    test("Ctrl+D enters addingElements drag mode", async ({ page, editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);
        await expect(editor.comps()).toHaveCount(1);

        await page.keyboard.press("Control+D");
        await expect(editor.comps()).toHaveCount(2);

        await pointer.moveTo(520, 260);
        await expectPosToBe(editor.comps().nth(1), 520, 260);

        await pointer.clickAt(520, 260);
        await expect(editor.comps()).toHaveCount(2);
    });

    test("Escape while dragging duplicate cancels clone", async ({ page, editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);

        await page.keyboard.press("Control+D");
        await expect(editor.comps()).toHaveCount(2);

        await pointer.moveTo(540, 280);
        await page.keyboard.press("Escape");

        await expect(editor.comps()).toHaveCount(1);
    });

    test("Release commits clone + selection swaps to clones", async ({ page, editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);

        await page.keyboard.press("Control+D");
        await pointer.moveTo(560, 320);
        await pointer.clickAt(560, 320);

        await expect(editor.comps()).toHaveCount(2);
        await expect(editor.comps().first()).not.toBeSelected();
        await expect(editor.comps().nth(1)).toBeSelected();

        await page.keyboard.press("Control+Z");
        await expect(editor.comps()).toHaveCount(1);
    });

    test("Duplicate mixed component+wire while dragging", async ({ page, editor, pointer }) => {
        await editor.addComponent("IN", 300, 200);
        await editor.addComponent("LED", 500, 200);

        await editor.drag(
            editor.getHandle("IN", "out").first(),
            editor.getHandle("LED", "in").first(),
            true,
        );
        await editor.dragTo(editor.getHandle("IN", "out").first(), 700, 280, true);

        await expect(editor.wires()).toHaveCount(2);

        await pointer.clickOn(editor.wires().first(), true);
        await editor.ctrlSelect(editor.getComponent("IN").first(), true);

        const externalWirePathBefore = await editor.wires().nth(1).getAttribute("d");

        await page.keyboard.press("Control+D");
        await pointer.moveTo(620, 280);
        await pointer.clickAt(620, 280);

        await expect(editor.comps()).toHaveCount(3);
        await expect(editor.wires()).toHaveCount(3);

        await editor.dragTo(editor.getComponent("IN").nth(1), 760, 360);
        await expect(editor.wires().nth(1)).toHaveAttribute("d", externalWirePathBefore!);
    });
});

test.describe("Duplicate with offset (selection toolbar button)", () => {
    test("Sidebar Duplicate offsets by one grid cell", async ({ editor }) => {
        await editor.addComponent("AND", 300, 300);

        await editor.getSidebar("selection").getByRole("button", { name: "Duplicate" }).click();
        await expect(editor.comps()).toHaveCount(2);

        await expectPosToBe(editor.comps().first(), 300, 300);
        await expectPosToBe(editor.comps().nth(1), 320, 320);
    });

    test("Repeated duplicate accumulates offset deterministically", async ({ editor }) => {
        await editor.addComponent("AND", 300, 300);
        const duplicate = editor.getSidebar("selection").getByRole("button", { name: "Duplicate" });

        await duplicate.click();
        await duplicate.click();
        await expect(editor.comps()).toHaveCount(3);

        await expectPosToBe(editor.comps().first(), 300, 300);
        await expectPosToBe(editor.comps().nth(1), 320, 320);
        await expectPosToBe(editor.comps().nth(2), 340, 340);
    });

    test("Offset duplicate of wire-only selection shifts both wire handles equally", async ({ editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);
        await editor.addComponent("AND", 520, 300);
        await editor.drag(editor.getHandle("AND", "out").first(), editor.getHandle("AND", "in1").nth(1));

        await expect(editor.wires()).toHaveCount(1);
        await pointer.clickAt(300, 200);
        await editor.wires().click({ force: true });
        await expect(editor.wires()).toBeSelected();

        const w0 = await centerOf(editor.wires().first());

        await editor.getSidebar("selection").getByRole("button", { name: "Duplicate" }).click();
        await expect(editor.wires()).toHaveCount(2);

        const w1 = await centerOf(editor.wires().nth(1));
        await expectPosToBe(editor.wires().nth(1), w0.x + 20, w0.y + 20);
    });

    test("Undo/redo duplicate offset", async ({ page, editor }) => {
        await editor.addComponent("AND", 300, 300);
        const duplicate = editor.getSidebar("selection").getByRole("button", { name: "Duplicate" });

        await duplicate.click();
        await expect(editor.comps()).toHaveCount(2);

        await page.keyboard.press("Control+Z");
        await expect(editor.comps()).toHaveCount(1);

        await editor.comps().first().click();
        await duplicate.click();
        await expect(editor.comps()).toHaveCount(2);
    });
});

test.describe("Copy and paste", () => {
    test("Ctrl+C then Ctrl+V pastes centered at mouse", async ({ page, editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);
        await page.keyboard.press("Control+C");

        await pointer.moveTo(680, 200);
        await page.keyboard.press("Control+V");

        await expect(editor.comps()).toHaveCount(2);
        await expectPosToBe(editor.comps().nth(1), 680, 200);
    });

    test("Paste after original deletion still works", async ({ page, editor }) => {
        await editor.addComponent("AND", 300, 300);
        await page.keyboard.press("Control+C");
        await page.keyboard.press("Delete");
        await expect(editor.comps()).toHaveCount(0);

        await page.keyboard.press("Control+V");
        await expect(editor.comps()).toHaveCount(1);
    });

    test("Paste after undoing original placement still works", async ({ page, editor }) => {
        await editor.addComponent("AND", 300, 300);
        await page.keyboard.press("Control+C");
        await page.keyboard.press("Control+Z");
        await expect(editor.comps()).toHaveCount(0);

        await page.keyboard.press("Control+V");
        await expect(editor.comps()).toHaveCount(1);
    });

    test("Multiple pastes from same copy are stable", async ({ page, editor }) => {
        await editor.addComponent("AND", 250, 220);

        await page.keyboard.press("Control+C");
        await page.keyboard.press("Control+V");
        await page.keyboard.press("Control+V");

        await expect(editor.comps()).toHaveCount(3);
        await expect(editor.wires()).toHaveCount(0);
    });

    test("Paste with no current selection still works", async ({ page, editor, pointer }) => {
        await editor.addComponent("AND", 300, 300);
        await page.keyboard.press("Control+C");
        await pointer.clickAt(300, 200);
        await expect(editor.comps()).not.toBeSelected();

        await page.keyboard.press("Control+V");
        await expect(editor.comps()).toHaveCount(2);
    });

    test("Empty clipboard paste is no-op", async ({ page, editor }) => {
        await expect(editor.comps()).toHaveCount(0);
        await page.keyboard.press("Control+V");
        await expect(editor.comps()).toHaveCount(0);
        await expect(editor.wires()).toHaveCount(0);
    });
});

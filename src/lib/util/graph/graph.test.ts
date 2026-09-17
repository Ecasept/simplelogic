import { beforeEach, describe, expect, it } from "vitest";
import { GraphManager } from "./graph.svelte";
import { UpdateCustomDataCommand } from "./commands";
import type { GraphData } from "../shared/types";

function document(): GraphData {
	return {
		components: Object.fromEntries(
			[0, 1].map((id) => [
				id,
				{
					id,
					type: "TEXT",
					position: { x: 0, y: 0 },
					size: { x: 1, y: 1 },
					rotation: 0,
					isPoweredInitially: false,
					handles: {},
					customData: { text: "Original" },
				},
			]),
		),
		wires: {},
		nextId: 2,
	};
}

let graph: GraphManager;
beforeEach(() => {
	graph = new GraphManager();
	graph.setGraphData(document());
});
const text = () => graph.getComponentData(0).customData?.text;
const type = (value: string) => graph.updateCustomDataMerged(0, "text", value);

describe("accepted field edits", () => {
	it("does not reopen an older text group after undoing another operation", () => {
		type("First");
		graph.executeCommand(new UpdateCustomDataCommand(0, "fontSize", 30));
		graph.applyChanges();
		graph.undoLastCommand();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("First");
		graph.undoLastCommand();
		expect(text()).toBe("Original");
	});

	it("closes the text group even when the next transaction stays empty", () => {
		type("First");
		graph.beginEdit().cancel();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("First");
		graph.undoLastCommand();
		expect(text()).toBe("Original");
	});

	it("publishes every input immediately and undoes the whole group without a finish signal", () => {
		type("H");
		expect(graph.graphData.components[0].customData?.text).toBe("H");
		expect(graph.historyEmpty).toBe(false);
		expect(graph.currentEdit).toBeNull();
		type("Hi");
		graph.undoLastCommand();
		expect(text()).toBe("Original");
		expect(graph.undoLastCommand().didUndo).toBe(false);
	});

	it("keeps text when a subsequent preview is cancelled and closes its group", () => {
		type("First");
		const edit = graph.beginEdit();
		edit.preview(new UpdateCustomDataCommand(0, "fontSize", 30));
		edit.cancel();
		expect(text()).toBe("First");
		expect(graph.getComponentData(0).customData?.fontSize).toBeUndefined();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("First");
		graph.undoLastCommand();
		expect(text()).toBe("Original");
	});

	it("keeps text, another command, and more text as three undo entries", () => {
		type("First");
		graph.executeCommand(new UpdateCustomDataCommand(0, "fontSize", 30));
		graph.applyChanges();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("First");
		expect(graph.getComponentData(0).customData?.fontSize).toBe(30);
		graph.undoLastCommand();
		expect(text()).toBe("First");
		expect(graph.getComponentData(0).customData?.fontSize).toBeUndefined();
		graph.undoLastCommand();
		expect(text()).toBe("Original");
	});

	it.each(["property", "component"])(
		"does not merge across a different %s",
		(boundary) => {
			type("First");
			const id = boundary === "component" ? 1 : 0;
			const property = boundary === "property" ? "label" : "text";
			graph.updateCustomDataMerged(id, property, "Other");
			type("Second");
			graph.undoLastCommand();
			expect(text()).toBe("First");
			graph.undoLastCommand();
			expect(graph.getComponentData(id).customData?.[property]).toBe(
				property === "text" ? "Original" : undefined,
			);
			graph.undoLastCommand();
			expect(text()).toBe("Original");
		},
	);

	it("does not merge new typing into an undone entry", () => {
		type("First");
		graph.undoLastCommand();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("Original");
		expect(graph.undoLastCommand().didUndo).toBe(false);
	});

	it("closing the text group cannot commit a newer preview", () => {
		type("First");
		const edit = graph.beginEdit();
		edit.preview(new UpdateCustomDataCommand(0, "fontSize", 30));
		graph.closeCustomDataGroup(); // A late text-field blur.
		expect(edit.active).toBe(true);
		edit.cancel();
		graph.undoLastCommand();
		expect(text()).toBe("Original");
	});

	it("rejects field edits during previews without modifying either edit", () => {
		const edit = graph.beginEdit();
		edit.preview(new UpdateCustomDataCommand(0, "fontSize", 30));
		expect(() => type("Hi")).toThrow("during a graph preview");
		expect(text()).toBe("Original");
		edit.cancel();
		expect(graph.undoLastCommand().didUndo).toBe(false);
	});

	it.each(["clear", "replace"])(
		"forgets the group on document %s",
		(operation) => {
			type("First");
			if (operation === "clear") graph.clear();
			graph.setGraphData(document());
			type("New document");
			graph.undoLastCommand();
			expect(text()).toBe("Original");
			expect(graph.undoLastCommand().didUndo).toBe(false);
		},
	);

	it("ignores unchanged inputs and allows an explicit boundary without a preview", () => {
		type("Original");
		expect(graph.undoLastCommand().didUndo).toBe(false);
		type("First");
		graph.closeCustomDataGroup();
		type("Second");
		graph.undoLastCommand();
		expect(text()).toBe("First");
		graph.discardChanges();
		expect(text()).toBe("First");
	});
});

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebarViewModel } from "./sidebarViewModel";
import { editorViewModel } from "./editorViewModel";
import { fileModalViewModel } from "./fileModalViewModel";
import { canvasViewModel } from "./canvasViewModel";
import { graph, graphManager } from "../graph";
import { CreateComponentCommand } from "../commands";
import { get } from "svelte/store";

describe("Sidebar ViewModel Test", () => {
	beforeEach(() => {
		(editorViewModel as any).resetUiState();
		(fileModalViewModel as any).resetUiState();
		(canvasViewModel as any).resetUiState();
		(sidebarViewModel as any).resetUiState();
		graph.data.set({ components: {}, wires: {}, nextId: 0 }); // also updates graph manager
	});
	it("should close the sidebar", () => {
		sidebarViewModel.toggleOpen();

		expect((sidebarViewModel as any).uiState.open).toBe(false);
	});
	it("should reopen the sidebar", () => {
		sidebarViewModel.toggleOpen();
		sidebarViewModel.toggleOpen();

		expect((sidebarViewModel as any).uiState.open).toBe(true);
	});
	it("should save the graph and discard any changes", () => {
		// Changes
		graphManager.executeCommand(
			new CreateComponentCommand({
				handles: {},
				label: "",
				position: { x: 0, y: 0 },
				size: { x: 0, y: 0 },
				type: "",
			}),
		);

		sidebarViewModel.saveGraph();

		expect((editorViewModel as any).uiState.isModalOpen).toBe(true);
		expect((fileModalViewModel as any).uiState.state).toBe("save");
		expect((graphManager as any).currentData).toStrictEqual({
			components: {},
			wires: {},
			nextId: 0,
		});
		expect((graphManager as any).history).toStrictEqual([]);
	});
	it("should load the graph and discard any changes", () => {
		// Changes
		graphManager.executeCommand(
			new CreateComponentCommand({
				handles: {},
				label: "",
				position: { x: 0, y: 0 },
				size: { x: 0, y: 0 },
				type: "",
			}),
		);

		sidebarViewModel.loadGraph();

		expect((editorViewModel as any).uiState.isModalOpen).toBe(true);
		expect((fileModalViewModel as any).uiState.state).toBe("load");
		expect((graphManager as any).currentData).toStrictEqual({
			components: {},
			wires: {},
			nextId: 0,
		});
		expect((graphManager as any).history).toStrictEqual([]);
	});
});

import { beforeEach, describe, expect, it } from "vitest";
import {
    canvasViewModel,
    CloneAction,
    editorViewModel,
    graphManager,
} from "./actions.svelte";
import { GRID_SIZE, setMousePosition } from "./global.svelte";
import { newWireHandleRef, type ComponentData, type GraphData, type WireData } from "./types";
import type { ElementType } from "./viewModels/editorViewModel.svelte";

type CloneEntries = Parameters<typeof CloneAction.getBoundingBox>[0];

function comp(id: number, overrides: Partial<ComponentData> = {}): ComponentData {
    return {
        id,
        type: "AND",
        size: { x: 1, y: 1 },
        position: { x: 10 * id, y: 10 * id },
        isPoweredInitially: false,
        rotation: 0,
        handles: {
            out: {
                edge: "right",
                pos: 0,
                type: "output",
                connections: [],
            },
            in1: {
                edge: "left",
                pos: 0,
                type: "input",
                connections: [],
            },
        },
        ...overrides,
    };
}

function wire(id: number, overrides: Partial<WireData> = {}): WireData {
    return {
        id,
        handles: {
            input: {
                x: 20,
                y: 20,
                type: "input",
                connections: [],
            },
            output: {
                x: 60,
                y: 20,
                type: "output",
                connections: [],
            },
        },
        ...overrides,
    };
}

if (typeof DOMPoint === "undefined") {
    (global as any).DOMPoint = class DOMPoint {
        constructor(public x = 0, public y = 0, public z = 0, public w = 1) { }
        matrixTransform() {
            return this;
        }
    };
}

describe("CloneAction", () => {
    beforeEach(() => {
        graphManager.clear();
        editorViewModel.hardReset();
        CloneAction.clipboard = [];
    });

    it("getCopies prunes external connections but keeps internal", () => {
        const c0 = comp(0);
        const w1 = wire(1);
        const w2 = wire(2);

        c0.handles.out.connections.push(newWireHandleRef(1, "input"), newWireHandleRef(2, "input"));
        w1.handles.input.connections.push({ id: 0, handleId: "out", handleType: "output", type: "component" });
        w2.handles.input.connections.push({ id: 0, handleId: "out", handleType: "output", type: "component" });

        const data: GraphData = {
            components: { 0: c0 },
            wires: { 1: w1, 2: w2 },
            nextId: 3,
        };

        const selected = new Map<number, ElementType>([
            [0, "component"],
            [1, "wire"],
        ]);

        const copies = CloneAction.getCopies(selected, data);
        expect(copies).toHaveLength(2);

        const copiedComp = copies.find(([, type]) => type === "component")![0] as ComponentData;
        const copiedWire = copies.find(([, type]) => type === "wire")![0] as WireData;

        expect(copiedComp.handles.out.connections).toHaveLength(1);
        expect(copiedComp.handles.out.connections[0].id).toBe(1);
        expect(copiedWire.handles.input.connections).toHaveLength(1);
        expect(copiedWire.handles.input.connections[0].id).toBe(0);
    });

    it("remapIds remaps ids + all handle connections consistently", () => {
        const c0 = comp(0);
        const w1 = wire(1);

        c0.handles.out.connections.push(newWireHandleRef(1, "input"));
        w1.handles.input.connections.push({ id: 0, handleId: "out", handleType: "output", type: "component" });

        const clones: CloneEntries = [[structuredClone(c0), "component"], [structuredClone(w1), "wire"]];
        const [remapped] = CloneAction.remapIds(clones, 10);

        const remappedComp = remapped.find(([, type]) => type === "component")![0] as ComponentData;
        const remappedWire = remapped.find(([, type]) => type === "wire")![0] as WireData;

        expect(remappedComp.id).toBe(10);
        expect(remappedWire.id).toBe(11);
        expect(remappedComp.handles.out.connections[0].id).toBe(11);
        expect(remappedWire.handles.input.connections[0].id).toBe(10);
    });

    it("shiftBy moves component positions and wire handles by same vector", () => {
        const data: GraphData = {
            components: { 0: comp(0, { position: { x: 100, y: 200 } }) },
            wires: {
                1: wire(1, {
                    handles: {
                        input: { x: 100, y: 200, type: "input", connections: [] },
                        output: { x: 160, y: 260, type: "output", connections: [] },
                    },
                }),
            },
            nextId: 2,
        };
        const selected = new Map<number, ElementType>([
            [0, "component"],
            [1, "wire"],
        ]);
        const clones = CloneAction.getCopies(selected, data);

        CloneAction.shiftBy(clones, { x: 20, y: -10 });

        expect((clones[0][0] as ComponentData).position).toEqual({ x: 120, y: 190 });
        const movedWire = clones[1][0] as WireData;
        expect(movedWire.handles.input.x).toBe(120);
        expect(movedWire.handles.input.y).toBe(190);
        expect(movedWire.handles.output.x).toBe(180);
        expect(movedWire.handles.output.y).toBe(250);
    });

    it("getBoundingBox handles mixed component/wire selections correctly", () => {
        const data: GraphData = {
            components: { 0: comp(0, { position: { x: 100, y: 100 }, size: { x: 2, y: 3 } }) },
            wires: {
                1: wire(1, {
                    handles: {
                        input: { x: 20, y: 80, type: "input", connections: [] },
                        output: { x: 220, y: 200, type: "output", connections: [] },
                    },
                }),
            },
            nextId: 2,
        };
        const selected = new Map<number, ElementType>([
            [0, "component"],
            [1, "wire"],
        ]);
        const mixed = CloneAction.getCopies(selected, data);

        const box = CloneAction.getBoundingBox(mixed);
        expect(box).toEqual({ minX: 20, minY: 80, maxX: 220, maxY: 200 });
    });

    it("copySelected stores deep clone snapshot", () => {
        const c0 = comp(0, { position: { x: 120, y: 140 } });
        const data: GraphData = { components: { 0: c0 }, wires: {}, nextId: 1 };

        graphManager.setGraphData(data);
        editorViewModel.setSelectedElements(new Map<number, ElementType>([[0, "component"]]));

        CloneAction.copySelected();
        expect(CloneAction.clipboard).toHaveLength(1);

        data.components[0].position.x = 999;
        const copied = CloneAction.clipboard[0][0] as ComponentData;
        expect(copied.position.x).toBe(120);
    });

    it("pasteClipboard remaps ids and inserts selected clones", () => {
        const c0 = comp(0, { position: { x: 100, y: 100 } });
        const data: GraphData = { components: { 0: c0 }, wires: {}, nextId: 1 };
        graphManager.setGraphData(data);

        editorViewModel.setSelectedElements(new Map<number, ElementType>([[0, "component"]]));
        CloneAction.copySelected();

        const originalClientToSVG = canvasViewModel.clientToSVGCoords.bind(canvasViewModel);
        (canvasViewModel as any).clientToSVGCoords = () => ({ x: 400, y: 300 });
        setMousePosition({ x: 400, y: 300 });

        try {
            CloneAction.pasteClipboard();
        } finally {
            (canvasViewModel as any).clientToSVGCoords = originalClientToSVG;
        }

        const gd = graphManager.getGraphData();
        expect(gd.components[1]).toBeDefined();
        expect(gd.nextId).toBe(2);
        expect(editorViewModel.getSelectedCount()).toBe(1);
        expect(editorViewModel.isSelectedId(1)).toBe(true);
    });

    it("duplicateSelectedWithOffset applies one grid offset and selects clones", () => {
        const c0 = comp(0, { position: { x: 100, y: 120 } });
        const data: GraphData = { components: { 0: c0 }, wires: {}, nextId: 1 };
        graphManager.setGraphData(data);
        editorViewModel.setSelectedElements(new Map<number, ElementType>([[0, "component"]]));

        CloneAction.duplicateSelectedWithOffset();

        const gd = graphManager.getGraphData();
        expect(gd.components[1]).toBeDefined();
        expect(gd.components[1].position.x).toBe(100 + GRID_SIZE);
        expect(gd.components[1].position.y).toBe(120 + GRID_SIZE);
        expect(editorViewModel.getSelectedCount()).toBe(1);
        expect(editorViewModel.isSelectedId(1)).toBe(true);
    });

    it("duplicateSelectedAndDrag enters addingElements with cloned id map", () => {
        const c0 = comp(0, { position: { x: 100, y: 120 } });
        const data: GraphData = { components: { 0: c0 }, wires: {}, nextId: 1 };
        graphManager.setGraphData(data);
        editorViewModel.setSelectedElements(new Map<number, ElementType>([[0, "component"]]));

        const originalClientToSVG = canvasViewModel.clientToSVGCoords.bind(canvasViewModel);
        (canvasViewModel as any).clientToSVGCoords = () => ({ x: 220, y: 210 });
        setMousePosition({ x: 220, y: 210 });

        try {
            CloneAction.duplicateSelectedAndDrag();
        } finally {
            (canvasViewModel as any).clientToSVGCoords = originalClientToSVG;
        }

        const state: any = editorViewModel.uiState;
        expect(state.matches({ editType: "addingElements" })).toBe(true);
        if (!state.matches({ editType: "addingElements" })) {
            throw new Error("Expected addingElements state");
        }
        expect(state.elements.get(1)).toBe("component");
        expect(state.clickPosition).toEqual({ x: 220, y: 210 });

        const gd = graphManager.getGraphData();
        expect(gd.components[1]).toBeDefined();
        expect(gd.nextId).toBe(2);
    });
});

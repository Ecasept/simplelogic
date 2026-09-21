import { describe, expect, it } from "vitest";
import type { ComponentData, WireData } from "../shared/types";
import {
	isComponentInViewport,
	isWireInViewport,
} from "./viewportCulling";

const viewBox = { x: 0, y: 0, width: 100, height: 100 };

function wire(input: [number, number], output: [number, number]): WireData {
	return {
		id: 1,
		handles: {
			input: { x: input[0], y: input[1], type: "input", connections: [] },
			output: {
				x: output[0],
				y: output[1],
				type: "output",
				connections: [],
			},
		},
	};
}

function component(overrides: Partial<ComponentData> = {}): ComponentData {
	return {
		id: 1,
		type: "AND",
		size: { x: 2, y: 1 },
		position: { x: 10, y: 10 },
		rotation: 0,
		handles: {},
		isPoweredInitially: false,
		...overrides,
	};
}

describe("viewport culling", () => {
	it("keeps visible components and culls distant components", () => {
		expect(isComponentInViewport(component(), viewBox, 0)).toBe(true);
		expect(
			isComponentInViewport(
				component({ position: { x: 101, y: 101 } }),
				viewBox,
				0,
			),
		).toBe(false);
	});

	it("accounts for rotation when finding component bounds", () => {
		expect(
			isComponentInViewport(
				component({ position: { x: 101, y: 40 }, rotation: 45 }),
				viewBox,
				0,
			),
		).toBe(true);
	});

	it("keeps wires which cross the viewport", () => {
		expect(isWireInViewport(wire([-20, 50], [120, 50]), viewBox, 0)).toBe(
			true,
		);
	});

	it("culls wires whose bounding box overlaps but line misses", () => {
		expect(isWireInViewport(wire([-10, 1], [1, -10]), viewBox, 0)).toBe(
			false,
		);
	});
});

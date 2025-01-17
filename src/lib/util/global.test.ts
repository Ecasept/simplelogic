import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	calculateHandleOffset,
	GRID_SIZE,
	gridSnap,
	isClickOverSidebar,
} from "./global";

describe("Global Tests", () => {
	it("gridSnap", () => {
		expect(gridSnap(20)).toBe(20);
		expect(gridSnap(0)).toBe(0);
		expect(gridSnap(10)).toBe(20);
		expect(gridSnap(9.9)).toBe(0);
		expect(gridSnap(1111)).toBe(1120);

		// Negative numbers are also rounded up (towards +inf)
		expect(gridSnap(-20)).toBe(-20);
		expect(gridSnap(-0)).toBe(-0);
		expect(gridSnap(-10)).toBe(-0);
		expect(gridSnap(-10.1)).toBe(-20);
		expect(gridSnap(-1111)).toBe(-1120);
	});

	describe("isClickOverSidebar", () => {
		let mockSidebar: HTMLElement;

		beforeEach(() => {
			mockSidebar = document.createElement("div");
			mockSidebar.classList.add("sidebarWrapper");
			document.body.appendChild(mockSidebar);

			vi.spyOn(mockSidebar, "getBoundingClientRect").mockReturnValue({
				left: 0,
				right: 100,
				top: 0,
				bottom: 100,
				width: 100,
				height: 100,
				x: 0,
				y: 0,
				toJSON: () => {},
			});

			vi.spyOn(document, "querySelector").mockReturnValue(mockSidebar);
		});

		afterEach(() => {
			document.body.removeChild(mockSidebar);
			vi.restoreAllMocks();
		});

		it("should return true when click is inside sidebar", () => {
			const event = new MouseEvent("click", { clientX: 50, clientY: 50 });
			expect(isClickOverSidebar(event)).toBe(true);
		});

		it("should return false when click is outside sidebar", () => {
			const event = new MouseEvent("click", { clientX: 150, clientY: 150 });
			expect(isClickOverSidebar(event)).toBe(false);
		});

		it("should return false when sidebar does not exist", () => {
			vi.spyOn(document, "querySelector").mockReturnValue(null);

			const event = new MouseEvent("click", { clientX: 50, clientY: 50 });
			expect(isClickOverSidebar(event)).toBe(false);
		});
	});

	describe("calculateHandleOffset", () => {
		it("calculates offset for left edge", () => {
			const result = calculateHandleOffset("left", 2, { x: 5, y: 5 });
			expect(result).toEqual({ x: 0, y: 2 * GRID_SIZE });
		});

		it("calculates offset for right edge", () => {
			const result = calculateHandleOffset("right", 3, { x: 4, y: 4 });
			expect(result).toEqual({ x: 4 * GRID_SIZE, y: 3 * GRID_SIZE });
		});

		it("calculates offset for top edge", () => {
			const result = calculateHandleOffset("top", 2, { x: 3, y: 3 });
			expect(result).toEqual({ x: 2 * GRID_SIZE, y: 0 });
		});

		it("calculates offset for bottom edge", () => {
			const result = calculateHandleOffset("bottom", 1, { x: 2, y: 2 });
			expect(result).toEqual({ x: GRID_SIZE, y: 2 * GRID_SIZE });
		});

		it("handles zero values correctly", () => {
			const result = calculateHandleOffset("left", 0, { x: 0, y: 0 });
			expect(result).toEqual({ x: 0, y: 0 });
		});

		it("handles large values correctly", () => {
			const result = calculateHandleOffset("right", 100, { x: 100, y: 100 });
			expect(result).toEqual({ x: 100 * GRID_SIZE, y: 100 * GRID_SIZE });
		});
	});

	
});

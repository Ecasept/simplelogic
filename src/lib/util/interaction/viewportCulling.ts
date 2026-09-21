import { GRID_SIZE } from "../shared/global.svelte";
import type { ComponentData, WireData, XYPair } from "../shared/types";
import type { ViewBox } from "./canvasViewModel";

export const VIEWPORT_OVERSCAN = GRID_SIZE * 2;

type Bounds = ViewBox;

function expanded(viewBox: ViewBox, padding: number): Bounds {
	return {
		x: viewBox.x - padding,
		y: viewBox.y - padding,
		width: viewBox.width + padding * 2,
		height: viewBox.height + padding * 2,
	};
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
	return (
		a.x <= b.x + b.width &&
		a.x + a.width >= b.x &&
		a.y <= b.y + b.height &&
		a.y + a.height >= b.y
	);
}

function rotatedBounds(
	points: XYPair[],
	center: XYPair,
	rotation: number,
): Bounds {
	const radians = (rotation * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const rotated = points.map((point) => {
		const dx = point.x - center.x;
		const dy = point.y - center.y;
		return {
			x: center.x + dx * cos - dy * sin,
			y: center.y + dx * sin + dy * cos,
		};
	});
	const xs = rotated.map(({ x }) => x);
	const ys = rotated.map(({ y }) => y);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	return {
		x: minX,
		y: minY,
		width: Math.max(...xs) - minX,
		height: Math.max(...ys) - minY,
	};
}

export function isComponentInViewport(
	component: ComponentData,
	viewBox: ViewBox,
	padding = VIEWPORT_OVERSCAN,
): boolean {
	const { position, rotation } = component;
	let left = position.x;
	let top = position.y;
	let width = component.size.x * GRID_SIZE;
	let height = component.size.y * GRID_SIZE;
	let center = { x: left + width / 2, y: top + height / 2 };

	// Text is anchored at its position and can be substantially wider than its
	// nominal graph size, so estimate its painted bounds conservatively.
	if (component.type === "TEXT") {
		const text = String(component.customData?.text ?? "");
		const fontSize = Number(component.customData?.fontSize) || 16;
		const lines = text.split("\n");
		width = Math.max(1, ...lines.map((line) => line.length)) * fontSize * 0.7;
		height = Math.max(1, lines.length) * fontSize * 1.2;
		const alignment = component.customData?.alignment ?? "center";
		left =
			alignment === "left"
				? position.x
				: alignment === "right"
					? position.x - width
					: position.x - width / 2;
		top = position.y - fontSize / 2;
		center = position;
	}

	const componentBounds = rotatedBounds(
		[
			{ x: left, y: top },
			{ x: left + width, y: top },
			{ x: left + width, y: top + height },
			{ x: left, y: top + height },
		],
		center,
		rotation,
	);
	return boundsIntersect(componentBounds, expanded(viewBox, padding));
}

export function isWireInViewport(
	wire: WireData,
	viewBox: ViewBox,
	padding = VIEWPORT_OVERSCAN,
): boolean {
	const rect = expanded(viewBox, padding);
	const start = wire.handles.input;
	const end = wire.handles.output;
	let tMin = 0;
	let tMax = 1;
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	for (const [origin, delta, min, max] of [
		[start.x, dx, rect.x, rect.x + rect.width],
		[start.y, dy, rect.y, rect.y + rect.height],
	] as const) {
		if (delta === 0) {
			if (origin < min || origin > max) return false;
			continue;
		}
		const first = (min - origin) / delta;
		const second = (max - origin) / delta;
		tMin = Math.max(tMin, Math.min(first, second));
		tMax = Math.min(tMax, Math.max(first, second));
		if (tMin > tMax) return false;
	}
	return true;
}

import type { XYPair } from "./types";

export class RotationInfo {
	constructor(public rotation: number, public center: XYPair) { }

	asRotate(): string {
		return `rotate(${this.rotation} ${this.center.x} ${this.center.y})`;
	}

	rotatePoint(p: XYPair): XYPair {
		const angle = (this.rotation * Math.PI) / 180;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const dx = p.x - this.center.x;
		const dy = p.y - this.center.y;
		return {
			x: this.center.x + dx * cos - dy * sin,
			y: this.center.y + dx * sin + dy * cos,
		};
	}

	/** Translation offset to move point p into its rotated position without rotating the element. */
	asTranslateFor(p: XYPair): string {
		const rotated = this.rotatePoint(p);
		const offset = { x: rotated.x - p.x, y: rotated.y - p.y };
		return `translate(${offset.x} ${offset.y})`;
	}
}

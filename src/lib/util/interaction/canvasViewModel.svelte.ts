import type { XYPair } from "../shared/types";

export type ViewBox = XYPair & { width: number; height: number };
export type CanvasUiState = { viewBox: ViewBox };

// Allow 25%–500% zoom relative to the initial 1000-unit viewport.
const MIN_VIEWBOX_WIDTH = 200;
const MAX_VIEWBOX_WIDTH = 4000;

/** Viewport geometry and coordinate conversion, independent of active gestures. */
export class CanvasViewModel {
	public uiState: CanvasUiState = $state({
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
	});
	protected resetUiState() {
		this.setViewBox({ x: 0, y: 0, width: 1000, height: 1000 });
	}
	svg: SVGSVGElement | null = null;

	setViewBox(viewBox: ViewBox) {
		this.uiState = { viewBox: { ...viewBox } };
	}

	pan(movementX: number, movementY: number) {
		const p0 = this.clientToSVGCoords({ x: 0, y: 0 });
		const p1 = this.clientToSVGCoords({ x: movementX, y: movementY });
		this.uiState.viewBox.x -= p1.x - p0.x;
		this.uiState.viewBox.y -= p1.y - p0.y;
	}

	zoom(factor: number, clientPos: XYPair) {
		if (!Number.isFinite(factor) || factor <= 0) {
			return;
		}
		const newWidth = Math.min(
			MAX_VIEWBOX_WIDTH,
			Math.max(MIN_VIEWBOX_WIDTH, this.uiState.viewBox.width * factor),
		);
		factor = newWidth / this.uiState.viewBox.width;
		if (factor === 1) return;
		const point = this.clientToSVGCoords(clientPos);

		// Use the clamped factor to preserve the aspect ratio and zoom anchor.
		const newHeight = this.uiState.viewBox.height * factor;

		// Adjust the viewBox position to zoom towards/from the mouse position
		this.uiState.viewBox.x =
			point.x - (point.x - this.uiState.viewBox.x) * factor;
		this.uiState.viewBox.y =
			point.y - (point.y - this.uiState.viewBox.y) * factor;
		this.uiState.viewBox.width = newWidth;
		this.uiState.viewBox.height = newHeight;
	}

	/** Maps a point on the screen to a coordinate on the svg */
	clientToSVGCoords(clientPos: XYPair) {
		const point = new DOMPoint(clientPos.x, clientPos.y);

		// Get the current transformation matrix of the SVG
		const ctm = this.svg?.getScreenCTM();
		if (ctm) {
			// Inverse transform the point using the SVG's matrix
			return point.matrixTransform(ctm.inverse());
		} else {
			console.error("Failed to get SVG transformation matrix");
			return { x: 0, y: 0 };
		}
	}

	/** Maps a point on the svg to a coordinate on the screen */
	svgToClientCoords(svgPos: XYPair) {
		const point = new DOMPoint(svgPos.x, svgPos.y);

		// Get the current transformation matrix of the SVG
		const ctm = this.svg?.getScreenCTM();
		if (ctm) {
			// Transform the point using the SVG's matrix
			return point.matrixTransform(ctm);
		} else {
			console.error("Failed to get SVG transformation matrix");
			return { x: 0, y: 0 };
		}
	}
}

export const canvasViewModel = new CanvasViewModel();

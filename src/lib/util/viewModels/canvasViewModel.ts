import type { XYPair } from "../types";
import { ViewModel } from "./viewModel";

export type CanvasUiState = {
	isPanning: boolean;
	viewBox: XYPair & { width: number; height: number };
	originalViewBox: XYPair & { width: number; height: number };
};

export class CanvasViewModel extends ViewModel<CanvasUiState> {
	protected _uiState: CanvasUiState = {
		isPanning: false,
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		originalViewBox: { x: 0, y: 0, width: 1000, height: 1000 },
	};
	protected resetUiState(): void {
		this._uiState = {
			isPanning: false,
			viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
			originalViewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		};
	}

	svg: SVGSVGElement | null = null;

	// ==== Canvas ====
	startPanning() {
		this._uiState.isPanning = true;
		this._uiState.originalViewBox = { ...this._uiState.viewBox };
		this.notifyAll();
	}
	stopPanning() {
		this._uiState.isPanning = false;
		this._uiState.originalViewBox = { ...this._uiState.viewBox };
		this.notifyAll();
	}
	abortPanning() {
		this._uiState.viewBox = { ...this._uiState.originalViewBox };
		this.stopPanning();
	}
	pan(movementX: number, movementY: number) {
		if (!this._uiState.isPanning) {
			return;
		}

		let { x, y } = this.clientToSVGCoords({
			x: -movementX,
			y: -movementY,
		});

		this._uiState.viewBox.x = x;
		this._uiState.viewBox.y = y;
		this.notifyAll();
	}
	zoom(factor: number, clientPos: XYPair) {
		const point = this.clientToSVGCoords(clientPos);

		// Update the viewBox
		const newWidth = this._uiState.viewBox.width * factor;
		const newHeight = this._uiState.viewBox.height * factor;

		// Adjust the viewBox position to zoom towards/from the mouse position
		this._uiState.viewBox.x =
			point.x - (point.x - this._uiState.viewBox.x) * factor;
		this._uiState.viewBox.y =
			point.y - (point.y - this._uiState.viewBox.y) * factor;
		this._uiState.viewBox.width = newWidth;
		this._uiState.viewBox.height = newHeight;

		this.notifyAll();
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

import type { XYPair } from "../types";
import { ViewModel } from "./viewModel";

export type CanvasUiState = {
	isPanning: boolean;
	viewBox: XYPair & { width: number; height: number };
};

export class CanvasViewModel extends ViewModel<CanvasUiState> {
	protected _uiState: CanvasUiState = {
		isPanning: false,
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
	};
	protected resetUiState(): void {
		this._uiState = {
			isPanning: false,
			viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		};
	}

	svg: SVGSVGElement | null = null;

	// ==== Canvas ====
	startPan() {
		this._uiState.isPanning = true;
		this.notifyAll();
	}
	endPan() {
		this._uiState.isPanning = false;
		this.notifyAll();
	}
	pan(movementX: number, movementY: number) {
		if (!this._uiState.isPanning) {
			return;
		}

		this._uiState.viewBox.x -= this.toSvgX(movementX);
		this._uiState.viewBox.y -= this.toSvgY(movementY);
		this.notifyAll();
	}
	/** Scale client's x-coordinate to svg's x-coordinate */
	toSvgX(val: number) {
		return (val * this._uiState.viewBox.width) / (this.svg?.clientWidth ?? 1);
	}
	/** Scale client's y-coordinate to svg's y-coordinate */
	toSvgY(val: number) {
		return (val * this._uiState.viewBox.height) / (this.svg?.clientHeight ?? 1);
	}
	/** Scale svg's x-coordinate to client's x-coordinate */
	toClientX(val: number) {
		return (val * (this.svg?.clientWidth ?? 1)) / this._uiState.viewBox.width;
	}
	/** Scale svg's y-coordinate to client's y-coordinate */
	toClientY(val: number) {
		return (val * (this.svg?.clientHeight ?? 1)) / this._uiState.viewBox.height;
	}

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
}

import type { XYPair } from "../types";
import { ViewModel } from "./viewModel";

type CanvasUiState = {
	isPanning: boolean;
	viewBox: XYPair & { width: number; height: number };
};

class CanvasViewModel extends ViewModel<CanvasUiState> {
	protected uiState: CanvasUiState = {
		isPanning: false,
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
	};
	protected resetUiState(): void {
		this.uiState = {
			isPanning: false,
			viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		};
	}

	svg: SVGSVGElement | null = null;

	// ==== Canvas ====
	startPan() {
		this.uiState.isPanning = true;
		this.notifyAll();
	}
	endPan() {
		this.uiState.isPanning = false;
		this.notifyAll();
	}
	pan(movementX: number, movementY: number) {
		if (!this.uiState.isPanning) {
			return;
		}

		this.uiState.viewBox.x -= this.toSvgX(movementX);
		this.uiState.viewBox.y -= this.toSvgY(movementY);
		this.notifyAll();
	}
	/** Scale client's x-coordinate to svg's x-coordinate */
	private toSvgX(val: number) {
		return (val * this.uiState.viewBox.width) / (this.svg?.clientWidth ?? 1);
	}
	/** Scale client's y-coordinate to svg's y-coordinate */
	private toSvgY(val: number) {
		return (val * this.uiState.viewBox.height) / (this.svg?.clientHeight ?? 1);
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

export const canvasViewModel = new CanvasViewModel();

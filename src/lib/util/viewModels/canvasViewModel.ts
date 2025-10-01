import type { XYPair } from "../types";
import { ViewModel } from "./viewModel";

export type ViewBox = XYPair & { width: number; height: number };

export type CanvasPanningState = {
	isPanning: true;
	/** How much the user has moved the viewBox
	 * since the start of panning */
	moveAmount: number;
	originalViewBox: ViewBox;
};

export type CanvasNotPanningState = {
	isPanning: false;
};

export type CanvasAreaSelectionState = {
	isAreaSelecting: true;
	startPos: XYPair;
	currentPos: XYPair;
};
export type CanvasNotAreaSelectingState = {
	isAreaSelecting: false;
};

export type CanvasUiState = {
	viewBox: ViewBox;
} & (CanvasPanningState | CanvasNotPanningState)
	& (CanvasAreaSelectionState | CanvasNotAreaSelectingState);

export class CanvasViewModel extends ViewModel<CanvasUiState> {
	protected _uiState: CanvasUiState = {
		isPanning: false,
		viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
		isAreaSelecting: false,
	};
	protected resetUiState(): void {
		this._uiState = {
			isPanning: false,
			viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
			isAreaSelecting: false,
		};
	}

	svg: SVGSVGElement | null = null;

	// ==== Canvas ====
	startAreaSelection(startPos: XYPair) {
		this._uiState = {
			isAreaSelecting: true,
			startPos,
			currentPos: startPos,
			isPanning: false,
			viewBox: this._uiState.viewBox,
		};
		this.notifyAll();
	}
	updateAreaSelection(currentPos: XYPair) {
		if (!this._uiState.isAreaSelecting) {
			console.warn("updateAreaSelection called when not area selecting");
			return;
		}
		this._uiState.currentPos = currentPos;
		this.notifyAll();
	}
	stopAreaSelection() {
		this._uiState = {
			isAreaSelecting: false,
			isPanning: false,
			viewBox: this._uiState.viewBox,
		};
		this.notifyAll();
	}
	startPanning() {
		this._uiState = {
			isPanning: true,
			moveAmount: 0,
			viewBox: this._uiState.viewBox,
			originalViewBox: { ...this._uiState.viewBox },
			isAreaSelecting: false,
		};
		this.notifyAll();
	}
	stopPanning() {
		this._uiState = {
			isPanning: false,
			viewBox: this._uiState.viewBox,
			isAreaSelecting: false,
		};
		this.notifyAll();
	}
	abortPanning() {
		if (!this._uiState.isPanning) {
			console.warn("abortPanning called when not panning");
			return;
		}
		this._uiState = {
			isPanning: false,
			viewBox: this._uiState.originalViewBox,
			isAreaSelecting: false,
		};
		this.notifyAll();
	}
	pan(movementX: number, movementY: number) {
		if (!this._uiState.isPanning) {
			console.warn("pan called when not panning");
			return;
		}

		let { x, y } = this.clientToSVGCoords({
			x: -movementX,
			y: -movementY,
		});

		this._uiState.viewBox.x = x;
		this._uiState.viewBox.y = y;
		this._uiState.moveAmount += Math.sqrt(movementX ** 2 + movementY ** 2);
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

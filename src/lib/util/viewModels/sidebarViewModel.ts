import { COMPONENT_IO_MAPPING, GRID_SIZE } from "../global";
import type { XYPair } from "../types";
import { canvasViewModel } from "./canvasViewModel";
import { editorViewModel } from "./editorViewModel";
import { fileModalViewModel } from "./fileModalViewModel";
import { ViewModel } from "./viewModel";

export type SidebarUiState = {
	open: boolean;
};

class SidebarViewModel extends ViewModel<SidebarUiState> {
	protected uiState: SidebarUiState = {
		open: true,
	};
	protected resetUiState(): void {
		this.uiState = {
			open: true,
		};
		this.notifyAll();
	}

	toggleOpen() {
		this.uiState.open = !this.uiState.open;
		this.notifyAll();
	}

	saveGraph() {
		editorViewModel.cancelChanges();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.setState("save");
	}

	loadGraph() {
		editorViewModel.cancelChanges();
		editorViewModel.setModalOpen(true);
		fileModalViewModel.setState("load");
	}
	undo() {
		editorViewModel.undo();
	}
	addComponent(label: string, type: string, pos: XYPair) {
		const data = structuredClone(COMPONENT_IO_MAPPING[type]);
		const svgPos = canvasViewModel.clientToSVGCoords(pos);
		editorViewModel.addComponent({
			type: type,
			label: label,
			size: { x: data.width, y: data.height },
			position: {
				x: svgPos.x - (data.width * GRID_SIZE) / 2,
				y: svgPos.y - (data.height * GRID_SIZE) / 2,
			},
			handles: data.connections,
		});
	}
}

export const sidebarViewModel = new SidebarViewModel();

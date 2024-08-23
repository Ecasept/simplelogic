import { COMPONENT_IO_MAPPING, GRID_SIZE } from "../global";
import type { XYPair } from "../types";
import { PersistenceAction } from "./actions";
import { ViewModel } from "./viewModel";

export type SidebarUiState = {
	open: boolean;
};

export class _SidebarViewModel extends ViewModel<SidebarUiState> {
	protected _uiState: SidebarUiState = {
		open: true,
	};
	protected resetUiState(): void {
		this._uiState = {
			open: true,
		};
	}

	toggleOpen() {
		this._uiState.open = !this._uiState.open;
		this.notifyAll();
	}
}

export const sidebarViewModel = new _SidebarViewModel();

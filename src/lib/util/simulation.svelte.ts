import { graph, graphManager } from "./actions";
import { isComponentConnection } from "./global";
import { ViewModel } from "./viewModels/viewModel";

export type SimulationData = {
	isPowered: boolean;
};
export namespace simulation {
	type SimulationState = Record<string, SimulationData>;

	export function getDataForComponent(id: number): SimulationData | null {
		return simulator.simData[id] ?? null;
	}

	export function simulate() {
		simulator.run();
	}

	class Simulator extends ViewModel<SimulationState> {
		protected _uiState: SimulationState = {};

		public simData: Readonly<SimulationState> = $state({});

		constructor() {
			super();
			// Setup runed store
			this.subscribe(() => {
				this.simData = this._uiState;
			});
		}

		private setupSimData() {
			const data = graph.getData();
			this._uiState = {};
			for (const [id, component] of Object.entries(data.components)) {
				this._uiState[id] = {
					isPowered: component.isPoweredInitially,
				};
			}
			for (const [id, wire] of Object.entries(data.wires)) {
				this._uiState[id] = {
					isPowered: false,
				};
			}
		}

		protected resetUiState(): void {
			this.setupSimData();
		}

		private queue: { id: number; isComponent: boolean }[] = [];

		run() {
			this.setupSimData();
			this.queue = Object.entries(this._uiState)
				.filter(([_, data]) => data.isPowered)
				.map(([id, _]) => ({ id: parseInt(id), isComponent: true }));
			while (this.step()) {}
			this.notifyAll();
		}

		step(): boolean {
			const obj = this.queue.shift();
			if (obj === undefined) {
				// Queue is empty
				return false;
			}
			if (obj.isComponent) {
				this.stepComponent(obj.id);
			} else {
				this.stepWire(obj.id);
			}
			this.notifyAll();
			return true;
		}

		stepComponent(id: number) {
			const component = graphManager.getComponentData(id);
			for (const handle of Object.values(component.handles)) {
				if (handle.type !== "output" || handle.connection === null) {
					continue;
				}
				const targetId = handle.connection.id;
				this._uiState[targetId].isPowered = true;
				this.queue.push({
					id: targetId,
					isComponent: isComponentConnection(handle.connection),
				});
			}
		}

		stepWire(id: number) {
			const wire = graphManager.getWireData(id);
			const output = wire.output;
			if (output.connection === null) {
				return;
			}
			const targetId = output.connection.id;
			this._uiState[targetId].isPowered = true;
			this.queue.push({
				id: targetId,
				isComponent: isComponentConnection(output.connection),
			});
		}
	}

	const simulator = new Simulator();
}

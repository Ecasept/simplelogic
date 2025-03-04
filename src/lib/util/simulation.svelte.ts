import { graphManager } from "./actions";
import { COMPONENT_DATA, isComponentConnection } from "./global.svelte";
import type { ComponentData, ComponentType, WireData } from "./types";
import { ViewModel } from "./viewModels/viewModel";

export type SimulationData = {
	inputs: Record<string, boolean>;
	outputs: Record<string, boolean>;
	type: ComponentType | "wire";
	isPoweredInitially: boolean;
};
export namespace simulation {
	type SimulationState = Record<string, SimulationData>;

	export function getDataForComponent(id: number): SimulationData | null {
		return simulator.simData[id] ?? null;
	}

	export function startSimulation() {
		simulator.run();
	}

	export function recomputeComponent(id: number) {
		simulator.recomputeComponent(id);
	}

	export function isSimulationRunning() {
		return simulator.running;
	}

	class Simulator extends ViewModel<SimulationState> {
		protected _uiState: SimulationState = {};

		public simData: Readonly<SimulationState> = $state({});
		public running: boolean = $state(false);

		constructor() {
			super();
			// Setup runed store
			this.subscribe(() => {
				this.simData = this._uiState;
			});
		}

		private computeComponentData(id: string, component: ComponentData) {
			const data: SimulationData = {
				type: component.type,
				inputs: Object.fromEntries(
					Object.entries(component.handles)
						.filter(([id, data]) => data.type == "input")
						.map(([id, data]) => {
							return [id, false];
						}),
				),
				outputs: Object.fromEntries(
					Object.entries(component.handles)
						.filter(([id, data]) => data.type == "output")
						.map(([id, data]) => {
							return [id, false];
						}),
				),
				isPoweredInitially: component.isPoweredInitially,
			};
			return data;
		}
		private computeWireData(id: string, wire: WireData) {
			const data: SimulationData = {
				type: "wire",
				inputs: { input: false },
				outputs: { output: false },
				isPoweredInitially: false,
			};
			return data;
		}

		private setupSimData() {
			const data = graphManager.getGraphData();
			this._uiState = {};
			for (const [id, component] of Object.entries(data.components)) {
				this._uiState[id] = this.computeComponentData(id, data.components[id]);
			}
			for (const [id, wire] of Object.entries(data.wires)) {
				this._uiState[id] = this.computeWireData(id, data.wires[id]);
			}
		}

		protected resetUiState(): void {
			this.setupSimData();
		}

		private queue: number[] = [];
		private isProcessing: boolean = false;

		async run() {
			this.setupSimData();
			this.queue = Object.entries(this._uiState)
				// Optimization: only recompute components that could output power
				// even if none of their inputs are powered
				.filter(([_, data]) =>
					data.type === "wire"
						? false
						: COMPONENT_DATA[data.type].canBePoweredWithoutAnyInputBeingPowered,
				)
				.map(([id, _]) => parseInt(id));
			await this.processQueue(true);
		}

		// Runs in the background and processes the queue
		private async processQueue(firstRun: boolean = false) {
			if (this.isProcessing) {
				// another processQueue is already running
				return;
			}
			this.isProcessing = true;

			this.running = true;
			while (true) {
				const finished = !this.step(firstRun);
				if (finished) {
					break;
				}

				// Don't block the event loop
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			this.running = false;
			this.notifyAll();
			this.isProcessing = false;
		}

		public recomputeComponent(id: number) {
			const data = graphManager.getComponentData(id);
			this._uiState[id].isPoweredInitially = data.isPoweredInitially;
			this.addComponentToQueue(id);
		}

		private addComponentToQueue(id: number) {
			this.queue.push(id);
			if (!this.isProcessing) {
				this.processQueue();
			}
		}

		private step(firstRun: boolean): boolean {
			const id = this.queue.shift();
			if (id === undefined) {
				// Queue is empty
				return false;
			}
			const data = this._uiState[id];
			const isComponent = data.type !== "wire";

			if (isComponent) {
				this.stepComponent(firstRun, id, data);
			} else {
				this.stepWire(firstRun, id, data);
			}
			this.notifyAll();
			return true;
		}

		private stepComponent(firstRun: boolean, id: number, data: SimulationData) {
			const component = graphManager.getComponentData(id);
			for (const [handleId, handle] of Object.entries(component.handles)) {
				if (handle.type !== "output") {
					continue;
				}
				const outputPower = executeGate(data, handle.type);
				// Output of the component has changed since last run
				const powerChanged =
					this._uiState[id].outputs[handleId] !== outputPower;
				this._uiState[id].outputs[handleId] = outputPower;

				if (powerChanged) {
					for (const connection of handle.connections) {
						const targetId = connection.id;
						this._uiState[targetId].inputs[connection.handleType] = outputPower;
						this.queue.push(targetId);
					}
				}
			}
		}

		private stepWire(firstRun: boolean, id: number, data: SimulationData) {
			const wire = graphManager.getWireData(id);
			const output = wire.output;

			const outputPower = executeGate(data, "output");
			const powerChanged = this._uiState[id].outputs["output"] !== outputPower;
			this._uiState[id].outputs["output"] = outputPower;

			if (powerChanged) {
				for (const connection of output.connections) {
					const targetId = connection.id;

					const targetHandleId = isComponentConnection(connection)
						? connection.handleId
						: connection.handleType;

					this._uiState[targetId].inputs[targetHandleId] = outputPower;
					this.queue.push(targetId);
				}
			}
		}
	}

	function executeGate(simData: SimulationData, outputId: string) {
		if (simData.type === "wire") {
			return simData.inputs.input;
		}
		return COMPONENT_DATA[simData.type].execute(
			simData.inputs,
			simData.isPoweredInitially,
			outputId,
		);
	}

	const simulator = new Simulator();
}

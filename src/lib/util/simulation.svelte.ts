import { graphManager } from "./actions.svelte";
import { COMPONENT_DATA, isComponentHandleRef } from "./global.svelte";
import type { ComponentData, ComponentType } from "./types";

/** The simulation data for a component or wire. */
export type SimulationData = {
	/** The current power state of the inputs. */
	inputs: Record<string, boolean>;
	/** The current power state of the outputs. */
	outputs: Record<string, boolean>;
	type: ComponentType | "wire";
	isPoweredInitially: boolean;
	/** True if the component is an LED and is currently powered. */
	ledPowered: boolean;
};
export type SimulationState = Record<string, SimulationData>;

export function getSimData(id: number): SimulationData | null {
	return simController.state[id] ?? null;
}

class SimulationController {
	public mode: "run" | "step" = $state("run");
	public notifyOnUpdateSetting: boolean = $state(true);

	/** The time that the simulation was started */
	private simulationStart: Date | null = null;
	/** How long the simulation ran */
	public simulationDuration: number = $state(0);

	/** Whether the simulation is currently processing the queue. */
	public loopRunning: boolean = $state(false);

	private onStopped: (() => void) | null = null;

	/** Whether the simulation should notify the UI on every update.
	 * This is true for the "step" mode and can also be set manually
	 */
	private get _notifyOnUpdate() {
		return this.notifyOnUpdateSetting || this.mode === "step";
	}

	public async setMode(mode: "run" | "step") {
		if (this.mode === mode) {
			return;
		}
		if (this.loopRunning) {
			await this.stopLoop();
		}
		this.mode = mode;
	}

	public start() {
		simulation.reset();
		if (this._notifyOnUpdate) {
			this.notifyAll();
		}
		if (this.mode === "run") {
			this.startLoop();
		}
	}

	public async stopLoop() {
		if (!this.loopRunning) {
			return;
		}
		this.loopRunning = false;
		return new Promise<void>((resolve) => {
			this.onStopped = resolve;
		});
	}

	public step() {
		const hasMoreWork = simulation.step();
		if (this._notifyOnUpdate) {
			this.notifyAll();
		}
		return hasMoreWork;
	}

	public async startLoop() {
		console.log("Starting simulation loop");
		this.loopRunning = true;
		this.simulationStart = new Date();

		while (true) {
			const hasMoreWork = this.step();
			if (!hasMoreWork) {
				break;
			}

			if (this.onStopped) {
				// If the processing was stopped, exit the loop
				this.loopRunning = false;
				this.onStopped();
				this.onStopped = null;
				break;
			}

			// Don't block the event loop
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		this.simulationDuration =
			new Date().getTime() - this.simulationStart.getTime();
		this.simulationStart = null;
		this.loopRunning = false;

		this.notifyAll();
	}

	public recomputeComponent(id: number) {
		simulation.recomputeComponent(id);
		if (this._notifyOnUpdate) {
			this.notifyAll();
		}
		if (this.mode === "run" && !this.loopRunning) {
			this.startLoop();
		}
	}

	public state: SimulationState = $state({});
	public queue: number[] = $state([]);

	private notifyAll() {
		this.state = simulation._state;
		this.queue = simulation._queue;
	}
}

class Simulation {
	/** The current state of the simulation.
	 * Every component and wire has an entry in this object
	 * that determines eg. whether it is powered or not.
	 */
	public _state: SimulationState = {};

	/* The queue of elements that need to be reprocessed. */
	public _queue: number[] = [];

	/** Returns the initial simulation data for `component`. */
	private getComponentInitData(component: ComponentData) {
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
			ledPowered: false,
		};
		return data;
	}

	/** Returns the initial simulation data for a wire. */
	private getWireInitData() {
		const data: SimulationData = {
			type: "wire",
			inputs: { input: false },
			outputs: { output: false },
			isPoweredInitially: false,
			ledPowered: false,
		};
		return data;
	}

	/** Initializes the simulation state with the current graph data.
	 * Every element receives an entry matching its graph data,
	 * but no data about its power state.
	 */
	private setupSimState() {
		const data = graphManager.getGraphData();
		this._state = {};
		for (const [id, component] of Object.entries(data.components)) {
			this._state[id] = this.getComponentInitData(component);
		}
		for (const [id, wire] of Object.entries(data.wires)) {
			this._state[id] = this.getWireInitData();
		}
	}

	/** Resets the simulation state to the initial state */
	public reset() {
		this.setupSimState();
		this._queue = Object.entries(this._state)
			// Optimization: only recompute components that could output power
			// even if none of their inputs are powered
			.filter(([_, data]) =>
				data.type === "wire"
					? false
					: COMPONENT_DATA[data.type].canBePoweredWithoutAnyInputBeingPowered,
			)
			.map(([id, _]) => parseInt(id));
		// Start processing the queue in the background
	}

	/** If a components initial power state was toggled,
	 * this function will recompute the component and its connections.
	 */
	public recomputeComponent(id: number) {
		const data = graphManager.getComponentData(id);
		this._state[id].isPoweredInitially = data.isPoweredInitially;
		this._queue.push(id);
	}

	/** Process the next element in the queue.
	 * @returns Whether the queue is empty and the processing can stop.
	 */
	public step(): boolean {
		const id = this._queue.shift();
		if (id === undefined) {
			// Queue is empty
			return false;
		}
		const data = this._state[id];
		const isComponent = data.type !== "wire";

		if (isComponent) {
			this.stepComponent(id, data);
		} else {
			this.stepWire(id, data);
		}
		return true;
	}

	/** Process a component in the queue.
	 * This function will recalculate the outputs of the component based on its current inputs.
	 * Then all connected inputs will be updated and added to the queue.
	 * @param id The id of the component to process.
	 * @param data The current simulation data of the component.
	 */
	private stepComponent(id: number, data: SimulationData) {
		const component = graphManager.getComponentData(id);
		for (const [handleId, handle] of Object.entries(component.handles)) {
			if (handle.type !== "output") {
				continue;
			}
			const outputPower = executeGate(data, handle.type);
			// Output of the component has changed since last run
			const powerChanged = this._state[id].outputs[handleId] !== outputPower;
			this._state[id].outputs[handleId] = outputPower;

			if (powerChanged) {
				for (const connection of handle.connections) {
					const targetId = connection.id;
					this._state[targetId].inputs[connection.handleType] = outputPower;
					this._queue.push(targetId);
				}
			}
		}
		if (component.type === "LED") {
			// Special handling for LEDs
			this._state[id].ledPowered = executeGate(data, "");
		}
	}

	/** Same as `stepComponent`, but for wires. */
	private stepWire(id: number, data: SimulationData) {
		const wire = graphManager.getWireData(id);
		const output = wire.handles.output;

		const outputPower = executeGate(data, "output");
		const powerChanged = this._state[id].outputs["output"] !== outputPower;
		this._state[id].outputs["output"] = outputPower;

		if (powerChanged) {
			for (const connection of output.connections) {
				const targetId = connection.id;

				const targetHandleId = isComponentHandleRef(connection)
					? connection.handleId
					: connection.handleType;

				this._state[targetId].inputs[targetHandleId] = outputPower;
				this._queue.push(targetId);
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

export const simulation = new Simulation();
export const simController = new SimulationController();

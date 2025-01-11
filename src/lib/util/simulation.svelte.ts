import { graph } from "./actions";

type SimulationData = {
	enabled: boolean;
};
type SimulationState = Record<string, SimulationData>;

let simulation: SimulationState = $state({});

export function setupSimulation() {
	const data = graph.getData();
	let simState: SimulationState = {};
	for (const [id, component] of Object.entries(data.components)) {
		simState[id] = {
			enabled: false,
		};
	}
	simulation = simState;
}

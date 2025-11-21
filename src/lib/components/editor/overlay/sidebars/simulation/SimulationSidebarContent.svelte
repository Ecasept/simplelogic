<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { getSimData, simController } from "$lib/util/simulation.svelte";
	import { RotateCcw } from "lucide-svelte";
	import ProcessingQueue from "./ProcessingQueue.svelte";
	import SimulationControls from "./SimulationControls.svelte";
	import UpdateDelay from "./UpdateDelay.svelte";

	let isEmpty = $derived(simController.queue.length === 0);
</script>

<div class="simulation-container">
	<SimulationControls
		isRunning={simController.continuousExecution}
		loopRunning={simController.loopRunning}
		finishedIn={simController.simulationDuration}
		start={() => simController.startContinuousExecution()}
		stop={() => simController.stopContinuousExecution()}
	/>

	<UpdateDelay
		max={1000}
		min={0}
		step={1}
		value={simController.updateDelay}
		onChange={(newValue) => (simController.updateDelay = newValue)}
	/>

	<ProcessingQueue
		items={simController.queue}
		getItemData={(id) => getSimData(id)}
		step={() => simController.stepForward()}
	/>

	<Button
		icon={RotateCcw}
		title="Reset Simulation"
		text="Reset"
		onClick={() => simController.reset()}
		type="danger"
	/>
</div>

<style lang="scss">
	.simulation-container {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}
</style>

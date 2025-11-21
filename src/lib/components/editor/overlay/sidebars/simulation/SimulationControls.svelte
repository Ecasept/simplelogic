<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { Check, Play, Square } from "lucide-svelte";
	import LoadingSpinner from "./LoadingSpinner.svelte";

	let {
		isRunning,
		loopRunning,
		finishedIn,
		stop,
		start,
	}: {
		isRunning: boolean;
		loopRunning: boolean;
		finishedIn: number;
		stop: () => void;
		start: () => void;
	} = $props();
</script>

<div class="container">
	<div class="run-controls">
		Simulation
		{#if isRunning}
			<Button
				icon={Square}
				title="Stop"
				onClick={stop}
				type="danger"
				margin="0"
				size="16px"
			/>
		{:else}
			<Button
				icon={Play}
				title="Start"
				onClick={start}
				type="primary"
				margin="0"
				size="16px"
			/>
		{/if}
	</div>
	<span class="status-text">
		{#if !loopRunning}
			<Check size={16} />
			Finished in {finishedIn.toFixed(0)} ms
		{:else}
			<LoadingSpinner size={16} spinnerWidth={4}></LoadingSpinner>
			Calculating...
		{/if}
	</span>
</div>

<style>
	.run-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	.container {
		background-color: var(--primary-container-color);
		border: 1px solid var(--primary-container-border-color);
		border-radius: var(--default-border-radius);
		padding: 6px;
		padding-left: 10px;
	}

	.status-text {
		font-size: 0.8em;
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}
</style>

<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { simController } from "$lib/util/simulation.svelte";
	import { Check, Clock, FastForward, Play } from "lucide-svelte";

	const mode = $derived(simController.mode);

	async function setMode(newMode: "run" | "step") {
		await simController.setMode(newMode);
		simController.start();
	}
</script>

<div class="simulation-container">
	<div class="switcher">
		<button
			class="mode-button run-button"
			class:selected={mode === "run"}
			onclick={() => setMode("run")}
		>
			<Play size={16} />
			Run
		</button>
		<button
			class="mode-button step-button"
			class:selected={mode === "step"}
			onclick={() => setMode("step")}
		>
			<FastForward size={16} />
			Step
		</button>
	</div>

	<div class="content-section">
		{#if mode === "run"}
			<div class="run-mode">
				{#if simController.loopRunning}
					<div class="processing-indicator">
						<div class="spinner"></div>
						<span class="processing-text">Processing simulation...</span>
						<Button
							onClick={() => simController.stopLoop()}
							text="Stop"
							type="danger"
						/>
					</div>
				{:else}
					{#if simController.simulationDuration}
						<div class="completion-status">
							<div class="success-indicator">
								<Check size={18} />
								<span>Simulation completed</span>
							</div>
							<div class="duration-display">
								<Clock size={14} />
								<span
									><strong>{simController.simulationDuration}ms</strong></span
								>
							</div>
						</div>
					{/if}
					<div class="settings-section">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={simController.notifyOnUpdateSetting}
								class="styled-checkbox"
							/>
							<span class="checkbox-text">Show updates during simulation</span>
						</label>
					</div>
				{/if}
			</div>
		{:else}
			{@const isEmpty = simController.queue.length === 0}
			<div class="step-mode">
				<div class="queue-section">
					<h4 class="queue-title">Processing Queue</h4>
					{#if simController.queue.length > 0}
						<div class="queue-list">
							{#each simController.queue as itemId}
								<div class="queue-item">
									<div class="queue-item-dot"></div>
									<span class="queue-item-text">{itemId}</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-queue">
							<span class="empty-text">No items in queue</span>
						</div>
					{/if}
				</div>

				<div class="step-controls">
					<Button
						onClick={() => simController.step()}
						text="Step Forward"
						type="primary"
						disabled={isEmpty}
						icon={FastForward}
						reversed={true}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.simulation-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.5rem;
		height: 100%;
	}

	.switcher {
		display: flex;
		background-color: var(--surface-variant-color);
		border-radius: 8px;
		padding: 4px;
		gap: 2px;
	}

	.mode-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background-color: transparent;
		color: var(--on-surface-variant-color);
		border: none;
		cursor: pointer;
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.2s ease;

		&:hover {
			background-color: var(--surface-highlight-color);
		}

		&.selected {
			background-color: var(--primary-color);
			color: var(--on-primary-color);
			box-shadow: 0 2px 4px var(--shadow-color);
		}
	}

	.content-section {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.run-mode,
	.step-mode {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.processing-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background-color: var(--processing-background-color);
		border-radius: 8px;
		border: 1px solid var(--processing-border-color);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid var(--outline-variant-color);
		border-top-color: var(--primary-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.processing-text {
		font-weight: 500;
		color: var(--on-surface-color);
	}

	.completion-status {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background-color: var(--success-container-color);
		border-radius: 8px;
		border: 1px solid var(--success-color);
	}

	.success-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--on-success-color);
		font-weight: 500;
	}

	.duration-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--on-surface-variant-color);
		font-size: 0.9rem;
	}

	.settings-section {
		padding: 1rem;
		background-color: var(--surface-variant-color);
		border-radius: 8px;
		border: 1px solid var(--outline-variant-color);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		user-select: none;
	}

	.styled-checkbox {
		width: 18px;
		height: 18px;
		accent-color: var(--primary-color);
		cursor: pointer;
	}

	.checkbox-text {
		color: var(--on-surface-color);
		font-size: 0.9rem;
	}

	.queue-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.queue-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--on-surface-color);
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--outline-variant-color);
	}

	.queue-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		padding: 0.5rem;
		background-color: var(--processing-background-color);
		border-radius: 6px;
		border: 1px solid var(--outline-variant-color);
	}

	.queue-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background-color: var(--surface-color);
		border-radius: 4px;
		border: 1px solid var(--surface-border-color);
	}

	.queue-item-dot {
		width: 8px;
		height: 8px;
		background-color: var(--primary-color);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.queue-item-text {
		color: var(--on-surface-color);
		font-size: 0.9rem;
		font-family: monospace;
	}

	.empty-queue {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background-color: var(--surface-variant-color);
		border-radius: 8px;
		border: 1px dashed var(--outline-variant-color);
	}

	.empty-text {
		color: var(--on-surface-variant-color);
		font-style: italic;
		font-size: 0.9rem;
	}

	.step-controls {
		padding-top: 1rem;
		border-top: 1px solid var(--outline-variant-color);
	}
</style>

<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import {
		COMPONENT_DATA,
		debugLog,
		isElementPowered,
	} from "$lib/util/global.svelte";
	import type { SimulationData } from "$lib/util/simulation.svelte";
	import { FastForward } from "lucide-svelte";

	let {
		items,
		getItemData,
		step,
	}: {
		items: number[];
		getItemData: (id: number) => SimulationData | null;
		step: () => void;
	} = $props();

	let isEmpty = $derived(items.length === 0);
	let count = $derived(items.length);

	$inspect(items).with(debugLog("Processing Queue Items"));
</script>

<div class="queue-card">
	<div class="header">
		<h4 class="title">Processing Queue</h4>
		<span class="badge" aria-label="items in queue">{count}</span>
	</div>

	{#if !isEmpty}
		<div class="queue-list" role="list">
			{#each items as itemId}
				{@const simData = getItemData(itemId)}
				{@const itemType = simData?.type}
				{@const powered = simData ? isElementPowered(simData) : false}
				<div
					class="queue-item"
					role="listitem"
					title={(itemType === "wire"
						? "Wire"
						: itemType
							? COMPONENT_DATA[itemType].name
							: "Unknown") + ` #${itemId}`}
				>
					<div class="dot" data-powered={powered} aria-hidden="true"></div>
					<span class="id">#{itemId}</span>
					<span class="type">
						{#if itemType === "wire"}
							Wire
						{:else if itemType}
							{COMPONENT_DATA[itemType].name}
						{:else}
							Unknown
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty" role="status" aria-live="polite">
			<span class="empty-text">No items in queue</span>
		</div>
	{/if}

	<div class="actions">
		<Button
			onClick={step}
			text="Step Forward"
			type="primary"
			disabled={isEmpty}
			icon={FastForward}
			reversed={true}
		/>
	</div>
</div>

<style lang="scss">
	.queue-card {
		background: var(--primary-container-color);
		border: 1px solid var(--primary-container-border-color);
		border-radius: var(--default-border-radius);
		padding: 10px;
		color: var(--on-primary-container-color);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title {
		margin: 0;
		font-weight: normal;
	}

	.badge {
		background: var(--primary-container-color);
		border: 1px solid var(--primary-container-border-color);
		color: var(--on-primary-container-color);
		font-size: 0.8em;
		line-height: 1;
		padding: 4px 4px;
		border-radius: 999px;
		min-width: 24px;
		text-align: center;
	}

	.queue-list {
		background: var(--surface-variant-color);
		border: 1px solid var(--surface-border-color);
		border-radius: calc(var(--default-border-radius) - 4px);
		max-height: 180px;
		overflow: auto;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		color: var(--on-surface-variant-color);
	}

	.queue-item {
		display: grid;
		grid-template-columns: 12px 1fr auto;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 8px;
	}

	.queue-item .type {
		font-size: 0.8em;
		opacity: 0.85;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--surface-variant-color) inset;
		background: var(--on-surface-variant-color);
	}

	/* Powered state */
	.dot[data-powered="true"] {
		background: var(--component-delete-color);
	}

	.empty {
		background: var(--surface-variant-color);
		border: 1px dashed var(--surface-border-color);
		border-radius: calc(var(--default-border-radius) - 4px);
		padding: 16px;
		text-align: center;
		color: var(--on-surface-variant-color);
		font-size: 12px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
</style>

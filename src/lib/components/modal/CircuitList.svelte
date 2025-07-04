<script lang="ts">
	import { circuitModalViewModel } from "$lib/util/actions.svelte";
	import { type ListRequestData } from "$lib/util/api";
	import { onEnter } from "$lib/util/keyboard";
	import { Calendar, Cpu, Trash2, Waypoints } from "lucide-svelte";

	type Props = {
		listData: ListRequestData | null;
		onSelect: (id: number) => void;
	};

	let { listData, onSelect }: Props = $props();

	async function deleteCircuit(id: number, goToPrevPage: boolean) {
		await circuitModalViewModel.deleteCircuit(id, goToPrevPage);
	}
</script>

<div class="list-container" role="menu">
	{#if listData !== null}
		{#each listData.circuits as circuitInfo (circuitInfo.id)}
			<div
				class="circuit-item-container"
				role="menuitem"
				aria-label={circuitInfo.name}
				tabindex="0"
				onclick={(_) => onSelect(circuitInfo.id)}
				onkeypress={onEnter((_) => onSelect(circuitInfo.id))}
			>
				<div class="circuit-item">
					<div class="circuit-info">
						<div class="circuit-name">{circuitInfo.name}</div>
						<div class="circuit-details">
							<div class="detail-item" aria-label="Wire count">
								<Waypoints size={16} />
								<span>{circuitInfo.wireCount}</span>
							</div>
							<div class="detail-item" aria-label="Component count">
								<Cpu size={16} />
								<span>{circuitInfo.componentCount}</span>
							</div>
							<div class="detail-item" aria-label="Created at">
								<Calendar size={16} />
								<span
									>{new Date(circuitInfo.createdAt).toLocaleDateString()}</span
								>
							</div>
						</div>
					</div>
				</div>
				<button
					class="delete-button"
					title="Delete circuit"
					onclick={(e) => {
						e.stopPropagation();
						// If this is the last circuit on the current page,
						// we need to navigate to the previous page after deletion
						const goToPrevPage =
							listData.circuits.length == 1 && listData.pagination.page > 1;
						deleteCircuit(circuitInfo.id, goToPrevPage);
					}}
				>
					<Trash2 size={20} />
				</button>
			</div>
		{/each}
		{#if listData.circuits.length === 0}
			<div class="text-span">
				No circuits found.<br />
				Save a circuit to see it here.
			</div>
		{/if}
	{:else}
		<div class="text-span">Loading...</div>
	{/if}
</div>

<style>
	.list-container {
		flex: 1;
		overflow-y: auto;
		margin: auto;
		width: 80%;
		border: 2px solid var(--primary-container-border-color);
		border-radius: 25px;
		overflow-x: hidden;
		overflow-y: auto;
		color: var(--on-primary-container-color);

		display: flex;
		flex-direction: column;

		background-color: var(--primary-container-color);
	}

	.circuit-item-container {
		display: flex;
		align-items: center;
		padding: 10px 20px;
		border-bottom: 1px solid var(--circuit-item-separator-color);
		cursor: pointer;
	}
	.circuit-item-container:last-child {
		border-bottom: none;
	}

	.circuit-item-container:hover:not(:has(.delete-button:hover)),
	.circuit-item-container:focus {
		background-color: #00000020;
	}

	.circuit-item {
		flex-grow: 1;
	}

	.circuit-info {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.circuit-name {
		font-weight: bold;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.circuit-details {
		display: flex;
		gap: 15px;
		color: var(--on-primary-container-color);
		opacity: 0.8;
		flex-shrink: 0;
	}

	.detail-item {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.delete-button {
		background: none;
		border: none;
		color: var(--on-primary-container-color);
		cursor: pointer;
		padding: 5px;
		border-radius: var(--default-border-radius);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-button:hover {
		background-color: #00000040;
	}

	.text-span {
		margin: 10px auto;
		text-align: center;
	}
</style>

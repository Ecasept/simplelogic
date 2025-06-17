<script lang="ts">
	import type { ListRequestData } from "$lib/util/api";
	import { onEnter } from "$lib/util/keyboard";

	type Props = {
		listData: ListRequestData | null;
		onSelect: (id: number) => void;
	};

	let { listData, onSelect }: Props = $props();
</script>

<div class="list-container">
	{#if listData !== null}
		{#each listData.circuits as circuitInfo (circuitInfo.id)}
			<div
				role="menuitem"
				tabindex="0"
				onclick={(_) => onSelect(circuitInfo.id)}
				onkeypress={onEnter((_) => onSelect(circuitInfo.id))}
				class="circuit-item"
			>
				{circuitInfo.name}
				<br />
				<span style="color: brown;">id: {circuitInfo.id}</span>
			</div>
		{/each}
	{:else}
		<div id="loading-span">Loading...</div>
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

	.circuit-item {
		padding: 10px;
		width: calc(100% - 20px);
		&:hover {
			background-color: #00000020;
			cursor: pointer;
		}
	}

	#loading-span {
		margin: 10px auto;
	}
</style>

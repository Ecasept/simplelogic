<script lang="ts">
	import { COMPONENT_DATA } from "$lib/util/global";
	import type { ComponentType } from "$lib/util/types";

	type Props = {
		simulating: boolean;
		onClick: (type: ComponentType, e: MouseEvent) => void;
	};
	let { simulating, onClick }: Props = $props();
</script>

<div class="toolbar">
	{#each Object.keys(COMPONENT_DATA) as Array<keyof typeof COMPONENT_DATA> as type}
		<button
			disabled={simulating}
			title={COMPONENT_DATA[type].description}
			onclick={(e) => onClick(type, e)}
		>
			{type}
		</button>
	{/each}
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-around;
		justify-content: flex-start;
	}
	button {
		background-color: var(--light-color);
		color: black;
		border: 1px solid black;
		cursor: pointer;
		height: 50px;
		width: 50px;
		border-radius: 16px;
		margin: 5px;

		&:hover {
			background-color: var(--light-darker-color);
		}
	}

	button:disabled {
		background-color: var(--light-color);
		color: gray;
		border: 1px solid gray;
		cursor: default;
	}
</style>

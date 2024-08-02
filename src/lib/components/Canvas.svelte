<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import Wire from "$lib/components/Wire.svelte";
	import { deepCopy } from "$lib/util/global";
	import { viewModel } from "$lib/util/graph";

	let innerHeight: number;
	let innerWidth: number;

	$: {
		console.log("Data Change:");
		console.log($viewModel);
	}
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div class="canvasWrapper">
	{#each Object.entries($viewModel.data.components) as [id_as_key, { id, label, size, position, type, connections }] (id)}
		<Component
			{id}
			{label}
			size={deepCopy(size)}
			position={deepCopy(position)}
			{type}
			connections={deepCopy(connections)}
			uiState={$viewModel.uiState}
		></Component>
	{/each}
	<div class="cableWrapper" style="--x: 0px; --y: 0px">
		<svg
			viewBox="0 0 -{innerHeight} -{innerWidth}"
			xmlns="http://www.w3.org/2000/svg"
			stroke-width="2px"
		>
			{#each Object.entries($viewModel.data.wires) as [id_as_key, { id, label, input, output }]}
				<Wire
					{label}
					{id}
					input={deepCopy(input)}
					output={deepCopy(output)}
					uiState={$viewModel.uiState}
				></Wire>
			{/each}
		</svg>
	</div>
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100vw;
		height: 100vh;
		background-size: var(--grid-size) var(--grid-size);
		/* shift the grid back by half of its size (because the dots are in the center) */
		/* and then shift it forward by half of the dot size (= its radius) so that the top left corner of the dot (and not the center) is the beginning of the image */
		background-position: calc(
				-1 * var(--grid-size) / 2 + var(--grid-dot-radius)
			)
			calc(-1 * var(--grid-size) / 2 + var(--grid-dot-radius));
		background-image: radial-gradient(
			circle,
			#000000 var(--grid-dot-radius),
			rgba(0, 0, 0, 0) var(--grid-dot-radius)
		);

		.cableWrapper {
			position: absolute;
			top: 0;
			left: 0;
			pointer-events: none;

			svg {
				height: 100vh;
				width: 100vw;
			}
		}
	}
</style>

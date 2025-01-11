<script lang="ts">
	import { GRID_SIZE } from "$lib/util/global";

	type Props = {
		x: number;
		y: number;
		width: number;
		height: number;
		type: string;
		simulating: boolean;
	}
	let { x, y, width, height, type, simulating }: Props = $props();

	let middleX = $derived(x + width / 2);
	let middleY = $derived(y + height / 2);

	function createSplitLine() {
		// Calculate middle points
		const startX = x;
		const startY = middleY;
		const endX = x + width;

		// Create upper and lower paths
		const upperPath = `M ${startX} ${startY} 
                      L ${middleX} ${middleY} 
                      L ${middleX} ${middleY - GRID_SIZE} 
                      L ${endX} ${middleY - GRID_SIZE}`;

		const lowerPath = `M ${startX} ${startY} 
                      L ${middleX} ${middleY} 
                      L ${middleX} ${middleY + GRID_SIZE} 
                      L ${endX} ${middleY + GRID_SIZE}`;

		return {
			upperPath,
			lowerPath,
		};
	}

	let { upperPath, lowerPath } = $derived.by(createSplitLine);
</script>

{#if type === "DUPLICATE"}
	<path d={upperPath} stroke="black" fill="none" />
	<path d={lowerPath} stroke="black" fill="none" />
{:else if type === "INPUT"}
	<circle
		class="input"
		cx={middleX}
		cy={middleY}
		r="10"
		style="pointer-events: {simulating ? 'all' : 'none'};"
	/>
{:else}
	<text
		x={x + width / 2}
		y={y + height / 2}
		font-size="12"
		dy=".35em"
		text-anchor="middle"
		fill="black"
	>
		{type}
	</text>
{/if}

<style>
	text {
		pointer-events: none;
	}
	path {
		pointer-events: none;
	}
</style>

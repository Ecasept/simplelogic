<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import { graph_store } from "$lib/stores/stores";
	import { onMount } from "svelte";
	import Wire from "$lib/components/Wire.svelte";
	import type {
		ComponentCreateEvent,
		WireCreateEvent,
		GraphData,
	} from "$lib/util/types";
	import { deepCopy } from "$lib/util/global";

	let canvas: HTMLDivElement;
	let svgWrapper: SVGSVGElement;
	let innerHeight: number;
	let innerWidth: number;

	let graph_data: GraphData = { components: [], wires: [], nextId: 0 };

	onMount(() => {
		graph_store.subscribe((data) => {
			graph_data = data;
			console.log(graph_data);
		});
	});

	export function onComponentCreate(e: CustomEvent<ComponentCreateEvent>) {
		const cmp = new Component({
			target: canvas,
			props: {
				id: null,
				type: e.detail.type,
				label: e.detail.label,
				connections: e.detail.connections,
				position: e.detail.position,
				size: e.detail.size,
			},
		});
		cmp.$on("delete", () => {
			cmp.$destroy();
		});
	}

	export function onWireCreate(e: CustomEvent<WireCreateEvent>) {
		const wire = new Wire({
			target: svgWrapper,
			props: {
				id: null,
				input: e.detail.input,
				output: e.detail.output,
				label: e.detail.label,
			},
		});
		wire.$on("delete", () => {
			wire.$destroy();
		});
	}
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div class="canvasWrapper" bind:this={canvas}>
	{#each Object.entries(graph_data.components) as [id_as_key, { id, label, size, position, type, connections }]}
		<Component
			{id}
			{label}
			size={deepCopy(size)}
			position={deepCopy(position)}
			{type}
			connections={deepCopy(connections)}
			on:wireCreate={onWireCreate}
		></Component>
	{/each}
	<div class="cableWrapper" style="--x: 0px; --y: 0px">
		<svg
			bind:this={svgWrapper}
			viewBox="0 0 -{innerHeight} -{innerWidth}"
			xmlns="http://www.w3.org/2000/svg"
			stroke-width="2px"
		>
			{#each Object.entries(graph_data.wires) as [id_as_key, { id, label, input, output }]}
				<Wire {label} {id} input={deepCopy(input)} output={deepCopy(output)}
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

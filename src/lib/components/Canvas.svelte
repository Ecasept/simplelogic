<script lang="ts">
	import Component from "$lib/components/Component.svelte";
	import { graph_store } from "$lib/stores/stores";
	import { onMount } from "svelte";
	import Wire from "$lib/components/Wire.svelte";
	import type {
		CreateComponentEvent,
		CreateWireEvent,
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

	export function createComponent(e: CustomEvent<CreateComponentEvent>) {
		const cmp = new Component({
			target: canvas,
			props: {
				id: null,
				type: e.detail.type,
				label: e.detail.label,
				inputs: e.detail.inputs,
				outputs: e.detail.outputs,
				position: e.detail.position,
				size: e.detail.size,
			},
		});
		cmp.$on("delete", () => {
			cmp.$destroy();
		});
	}

	export function createWire(e: CustomEvent<CreateWireEvent>) {
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
	{#each Object.entries(graph_data.components) as [id_as_key, { id, label, size, position, type, inputs, outputs }]}
		<Component
			{id}
			{label}
			size={deepCopy(size)}
			position={deepCopy(position)}
			{type}
			inputs={deepCopy(inputs)}
			outputs={deepCopy(outputs)}
			on:createWire={createWire}
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
		background-position: -24px -24px;
		background-image: radial-gradient(
			circle,
			#000000 1px,
			rgba(0, 0, 0, 0) 1px
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

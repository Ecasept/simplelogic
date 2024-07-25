<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import { graph } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	import Wire from '$lib/components/Wire.svelte';
	import type {
		ComponentIOList,
		HandleDownEvent,
		GraphData,
	} from '$lib/util/types';

	let canvas: HTMLDivElement;
	let innerHeight: number;
	let innerWidth: number;

	let graph_data: GraphData = {components: [], wires: [], nextId: 0};

	onMount(() => {
		graph.subscribe((data) => {
			graph_data = data;
			console.log(graph_data);
			
		});
	});

	function onHandleDown(e: CustomEvent<HandleDownEvent>) {
		e.preventDefault();
		graph.update((data) => {
			let id = data.nextId;
			data.nextId++;
			data.wires[id] = {
				id: id,
				label: 'test',
				input: {
					x: e.detail.handleX,
					y: e.detail.handleY,
					id: e.detail.type === "output" ? e.detail.id : -1,
				},
				output: {
					x: e.detail.handleX,
					y: e.detail.handleY,
					id: e.detail.type === "input" ? e.detail.id : -1,
				},
			};
			return data;
		});
	}

	const mapping: {[key:string]: {inputs: ComponentIOList, outputs: ComponentIOList}} = {
		AND: {
			inputs: { 'left': [{ type: 'in1' }, { type: 'in2' }] },
			outputs: { 'right': [{ type: 'out' }] }
		},
		OR: {
			inputs: { 'top': [{ type: 'in1' }, { type: 'in2' }] },
			outputs: { 'bottom': [{ type: 'out' }] }
		}
	};

	export function addCmp(label: string, type: string) {
		graph.update((data) => {
			if (type in mapping) {
				const inputs = mapping[type].inputs;
				const outputs = mapping[type].outputs;
				let height = (inputs.left?.length || 0) + (outputs.left?.length || 0);
				height = Math.max(height, (inputs.right?.length || 0) + (outputs.right?.length || 0));
				let width = (inputs.top?.length || 0) + (outputs.top?.length || 0);
				width = Math.max(width, (inputs.bottom?.length || 0) + (outputs.bottom?.length || 0));

				let id = data.nextId;
				data.nextId++;

				data.components[id] = {
					id: id,
					label: label,
					type: 'AND',
					size: { x: width + 1, y: height + 1 },
					position: { x: 400, y: 400 },
					inputs: inputs,
					outputs: outputs
				};
				return data;
			} else {
				console.error(`Tried to add component of non-existing type \"${type}\"!`)
				return data; // return unmodified data
			}
		});
	}
</script>


<div class="canvasWrapper" bind:this={canvas}>
	{#each Object.entries(graph_data.components) as [id_as_key, { id, label, size, position, type, inputs, outputs }]}
	<Component {id} {label} {size} {position} {type} {inputs} {outputs}
								 on:handleDown={onHandleDown}></Component>
	{/each}
	<div class="cableWrapper" style="--x: 0px; --y: 0px">
		<svg viewBox="0 0 -{innerHeight} -{innerWidth}" xmlns="http://www.w3.org/2000/svg" stroke-width="2px">
			{#each Object.entries(graph_data.wires) as [id_as_key, { id, label, input, output }]}
					<Wire on:handleDown={onHandleDown} {label} {id} {input} {output}></Wire>
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
		background-image: radial-gradient(circle, #000000 1px, rgba(0, 0, 0, 0) 1px);

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
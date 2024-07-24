<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import { graph } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	import Wire from '$lib/components/Wire.svelte';
	import type {
		ComponentIOList,
		WireIOList,
		ComponentDownEvent,
		HandleDownEvent,
		ComponentData,
		WireData, GraphData
	} from '$lib/util/types';
    import { GRID_SIZE } from '$lib/util/global';

	let updatePosition: ((x: number, mouseStartOffsetX: number, y: number, mouseStartOffsetY: number) => void) | null = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let canvas: HTMLDivElement;
	let innerHeight: number;
	let innerWidth: number;
	let mouseStartOffset = { x: 0, y: 0 };

	let graph_data: GraphData = {components: [], wires: []};

	onMount(() => {
		graph.subscribe((data) => {
			graph_data = data;
		});
	});

	function onCmpDown(e: CustomEvent<ComponentDownEvent>) {
		grabbedCmp = e.detail.component;
		updatePosition = e.detail.updatePosition;
		grabbedCmp?.classList.add('grabbed');
		mouseStartOffset = e.detail.mouseOffset;
	}

	function onHandleDown(e: CustomEvent<HandleDownEvent>) {
		e.preventDefault();
		graph.update((data) => {
			let id = data.nextId;
			data.nextId++;
			data.wires[id] = {
				id: id,
				label: 'test',
				inputs: [{
					x: e.detail.handleX,
					y: e.detail.handleY,
					id: e.detail.id
				}],
				outputs: []
			};
			return data;
		});
		updatePosition = function(x, mouseStartOffsetX, y, mouseStartOffsetY) {
			graph.update((data) => {
				let outputs = data[id].outputs as WireIOList;
				let inputs = data[id].inputs as WireIOList
				outputs[0] = {
				  x: Math.round(x / GRID_SIZE) * GRID_SIZE,
				  y: Math.round(inputs[0].y / GRID_SIZE) * GRID_SIZE,
					id: -1
				}
				return data;
			});
		}
		updatePosition(e.detail.handleX, 0, e.detail.handleY, 0)
	}

	function onMouseMove(e: MouseEvent) {
		if (updatePosition === null) return;
		updatePosition(e.clientX, mouseStartOffset.x, e.clientY, mouseStartOffset.y);
	}

	function onMouseUp(e: MouseEvent) {
		grabbedCmp?.classList.remove('grabbed');
		grabbedCmp = null;
		updatePosition = null;
	}

	let mapping: {[key:string]: {inputs: ComponentIOList, outputs: ComponentIOList}} = {
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

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} bind:innerHeight bind:innerWidth></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each graph_data.components as { id, label, size, position, type, inputs, outputs }}
			<Component {id} {label} {size} {position} {type} {inputs} {outputs} on:componentDown={onCmpDown}
								 on:handleDown={onHandleDown}></Component>
	{/each}
	<div class="cableWrapper" style="--x: 0px; --y: 0px">
		<svg viewBox="0 0 -{innerHeight} -{innerWidth}" xmlns="http://www.w3.org/2000/svg" stroke-width="2px">
			{#each graph_data.wires as { label, inputs, outputs }, id}
					<Wire {id} points="{[{x: inputs[0].x, y: inputs[0].y}, {x: outputs[0].x || 0, y: outputs[0].y || 0}]}">
					</Wire>
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
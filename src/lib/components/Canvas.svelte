<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import { graph } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	import Wire from '$lib/components/Wire.svelte';
	import type {
		ComponentIOList,
		ComponentDownEvent,
		HandleDownEvent,
		GraphData,
	    WireAddEvent,

      UpdatePositionFunction,

	} from '$lib/util/types';

	let updatePosition: UpdatePositionFunction | null = null;
	let setPosition: UpdatePositionFunction | null = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let canvas: HTMLDivElement;
	let innerHeight: number;
	let innerWidth: number;
	let mouseStartOffset = { x: 0, y: 0 };

	let graph_data: GraphData = {components: [], wires: [], nextId: 0};

	onMount(() => {
		graph.subscribe((data) => {
			graph_data = data;			
		});
	});

	function onCmpDown(e: CustomEvent<ComponentDownEvent>) {
		grabbedCmp = e.detail.component;
		updatePosition = e.detail.updatePosition;
		setPosition = e.detail.setPosition;
		grabbedCmp?.classList.add('grabbed');
		mouseStartOffset = e.detail.mouseOffset;
	}

	function onHandleDown(e: CustomEvent<HandleDownEvent>) {
		e.preventDefault();
		mouseStartOffset = {x: 0, y: 0};
		graph.update((data) => {
			let id = data.nextId;
			data.nextId++;
			console.log(data.wires[id])
			data.wires[id] = {
				id: id,
				label: 'test',
				input: {
					x: e.detail.handleX,
					y: e.detail.handleY,
					id: e.detail.id
				},
				output: {
					x: e.detail.handleX,
					y: e.detail.handleY,
					id: -1
				}
			};
			return data;
		});
	}

	function onWireAdd(e: CustomEvent<WireAddEvent>) {
		updatePosition = e.detail.updatePosition;
		setPosition = e.detail.setPosition;
	}

	function onMouseMove(e: MouseEvent) {
		if (updatePosition) {
			updatePosition(e.clientX, mouseStartOffset.x, e.clientY, mouseStartOffset.y);
		}
	}

	function onMouseUp(e: MouseEvent) {
		grabbedCmp?.classList.remove('grabbed');
		if (setPosition) {
			setPosition(e.clientX, mouseStartOffset.x, e.clientY, mouseStartOffset.y);
		}
		
		grabbedCmp = null;
		updatePosition = null;
		setPosition = null;
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

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} bind:innerHeight bind:innerWidth></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each Object.entries(graph_data.components) as [id_as_key, { id, label, size, position, type, inputs, outputs }]}
	<Component {id} {label} {size} {position} {type} {inputs} {outputs} on:componentDown={onCmpDown}
								 on:handleDown={onHandleDown}></Component>
	{/each}
	<div class="cableWrapper" style="--x: 0px; --y: 0px">
		<svg viewBox="0 0 -{innerHeight} -{innerWidth}" xmlns="http://www.w3.org/2000/svg" stroke-width="2px">
			{#each Object.entries(graph_data.wires) as [id_as_key, { id, label, input, output }]}
					<Wire on:wireAdd={onWireAdd} {label} {id} {input} {output}>
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
<script lang="ts">
	import Component from '$lib/components/Component.svelte';
	import { graph } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	import Wire from '$lib/components/Wire.svelte';
	import type { ComponentIOList, WireIOList, componentDownEvent, graphItem, handleDownEvent } from '$lib/util/types'
    import { GRID_SIZE } from '$lib/util/global';

	let updatePosition: ((x: number, mouseStartOffsetX: number, y: number, mouseStartOffsetY: number) => void) | null = null;
	let grabbedCmp: HTMLDivElement | null = null;

	let canvas: HTMLDivElement;
	let mouseStartOffset = { x: 0, y: 0 };

	let graph_data: graphItem[] = [];

	onMount(() => {
		graph.subscribe((data) => {
			graph_data = data;
		});
	});

	function onCmpDown(e: CustomEvent<componentDownEvent>) {
		grabbedCmp = e.detail.component;
		updatePosition = e.detail.updatePosition;
		grabbedCmp?.classList.add('grabbed');
		mouseStartOffset = e.detail.mouseOffset;
	}

	function onHandleDown(e: CustomEvent<handleDownEvent>) {
		let cmp = graph_data[e.detail.id];
		let x = 0;
		let y = 0;
		if(["left", "right"].includes(e.detail.pos)) {
			x = cmp.position.x + (e.detail.pos == "right" ? (GRID_SIZE * cmp.size.x) : 0)
			y = cmp.position.y + (GRID_SIZE * (e.detail.handleIndex + 1))
		} else {
			x = cmp.position.x + (GRID_SIZE * (e.detail.handleIndex + 1));
			y = cmp.position.y + (e.detail.pos == "bottom" ? (GRID_SIZE * cmp.size.y) : 0)
		}
		e.preventDefault();
		let id = 0;
		graph.update((data) => {
			id = data.length;
			data[id] = {
				id: id,
				label: 'test',
				type: 'CABLE',
				size: { x: 200, y: 200 },
				position: { x: 400, y: 400 },
				inputs: [{
					x: x,
					y: y,
					id: e.detail.id
				}],
				outputs: []
			};
			return data;
		});
		updatePosition = function(x, mouseStartOffsetX, y, mouseStartOffsetY) {
			graph.update((data) => {
				let outputs = data[id].outputs as WireIOList;
				outputs[0] = {
					x: x,
					y: y,
					id: -1
				}
				return data;
			});
		}
		updatePosition(x, 0, y, 0)
	}

	function onMouseMove(e: MouseEvent) {
		if (updatePosition === null) return;
		updatePosition(e.clientX,mouseStartOffset.x, e.clientY, mouseStartOffset.y);
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

				data[data.length] = {
					id: graph_data.length,
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

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp}></svelte:window>

<div class="canvasWrapper" bind:this={canvas}>
	{#each graph_data as { label, size, position, type, inputs, outputs }, id}
		{#if type !== "CABLE"}
			<Component {id} {label} {size} {position} {type} {inputs} {outputs} on:componentDown={onCmpDown} on:handleDown={onHandleDown}></Component>
		{:else}
			<Wire {id} {position}
						points="{[{x: inputs[0].x, y: inputs[0].y}, {x: outputs[0].x || 0, y: outputs[0].y || 0}]}">
			</Wire>
		{/if}
	{/each}
</div>

<style lang="scss">
	.canvasWrapper {
		width: 100vw;
		height: 100vh;
		background-size: var(--grid-size) var(--grid-size);
		background-position: -24px -24px;
		background-image: radial-gradient(circle, #000000 1px, rgba(0, 0, 0, 0) 1px);

	}
</style>
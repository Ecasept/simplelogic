<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let id;
	export let label: string = 'Component';
	export let type: string;
	export let position: { x: number, y: number } = { x: 0, y: 0 };
	let absolutePosition: { x: number, y: number } = { x: position.x, y: position.y };
	let inputs: [] = [];
	let outputs: [] = [];

	let mapping: {} = {
		AND: {
			inputs: [{ pos: 'right', handles: [{ type: 'in1' }, { type: 'in2' }] }],
			outputs: [{ pos: 'left', handles: [{ type: 'out' }] }]
		}
	};

	if (Object.hasOwn(mapping, type)) {
		inputs = mapping[type].inputs;
		outputs = mapping[type].outputs;
	}

	let wrapper: HTMLDivElement;
	let grabbed: boolean = false;
	const dispatch = createEventDispatcher();

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();
		dispatch('componentDown', {
			id: id,
			component: this,
			mouseOffset: { x: e.offsetX, y: e.offsetY },
			updatePosition: updatePosition
		});
	}

	function handleDown(pos, e) {
		e.preventDefault();
		dispatch('handleDown', {
			pos: pos,
			component: this
		});
	}

	export let gridSize = 50;

	function updatePosition(x, y) {
		absolutePosition.x = x;
		absolutePosition.y = y;
		position.x = Math.round(absolutePosition.x / gridSize) * gridSize;
		position.y = Math.round(absolutePosition.y / gridSize) * gridSize;
		wrapper.style.left = String(position.x) + 'px';
		wrapper.style.top = String(position.y) + 'px';
	}
</script>


<div id={id} class="wrapper" bind:this={wrapper} style="--x: {position.x}px; --y: {position.y}px">
	<div class="contentWrapper" on:mousedown={onCmpDown}>
		<p>{label}</p>
		{id}
	</div>
	{#each inputs as input}
		{#each input.handles as handle, i}
			<div class="handle {input.pos}" on:mousedown={(e) => handleDown(handle.type, e)}
					 style="--num: {input.handles.length}; --index: {i}" title={handle.type}>
				<div />
			</div>
		{/each}
	{/each}
	{#each outputs as output}
		{#each output.handles as handle, i}
			<div class="handle {output.pos}" on:mousedown={(e) => handleDown(handle.type, e)}
					 style="--num: {output.handles.length}; --index: {i}" title={handle.type}>
				<div />
			</div>
		{/each}
	{/each}
</div>

<style lang="scss">
	.wrapper {
		height: 198px;
		width: 198px;
		position: absolute;
		top: var(--y);
		left: var(--x);
		border: black 2px solid;
		cursor: grabbing;

		&:not(.grabbed) {
			cursor: grab;
		}

		&:hover {
			.handle {
				display: block;
			}
		}

		.contentWrapper {
			height: 100%;
			width: 100%;
			position: absolute;
			top: 0;
		}


		.handle {
			display: none;
			z-index: 1;
		}

		.handle {
			width: 10px;
			height: 10px;
			padding: 10px;

			&:hover {
				width: 20px;
				height: 20px;
				padding: 5px;
			}

			div {
				height: 100%;
				width: 100%;
				background-color: black;
				border-radius: 100%;
			}

			&.top {
				position: absolute;
				top: -16px;
				left: calc((100% / (var(--num) + 1)) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.right {
				position: absolute;
				right: -16px;
				top: calc((100% / (var(--num) + 1)) * (var(--index) + 1));
				transform: translateY(-50%);
			}

			&.bottom {
				position: absolute;
				bottom: -16px;
				left: calc((100% / (var(--num) + 1)) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.left {
				position: absolute;
				left: -16px;
				top: calc((100% / (var(--num) + 1)) * (var(--index) + 1));
				transform: translateY(-50%);
			}
		}
	}
</style>
<script lang="ts">
	import { GRID_SIZE, gridSnap } from "$lib/util/global";
	import {
		AddComponentCommand,
		executeCommand,
		SetComponentPositionCommand,
	} from "$lib/util/graph";
	import type {
		ComponentIOList,
		CreateWireEvent,
		XYPair,
	} from "$lib/util/types";
	import { createEventDispatcher, onMount } from "svelte";

	export let id: number | null;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let inputs: ComponentIOList;
	export let outputs: ComponentIOList;
	let height = size.y;
	let width = size.x;

	let mouseOffset: { x: number; y: number } | null;
	let grabbing = false;
	$: cursor = grabbing ? "grabbing" : "grab";

	const dispatch = createEventDispatcher<{
		createWire: CreateWireEvent;
		delete: null;
	}>();

	onMount(() => {
		if (id === null) {
			// being created

			mouseOffset = {
				x: Math.round((size.x * GRID_SIZE) / 2),
				y: Math.round((size.y * GRID_SIZE) / 2),
			};

			window.addEventListener("mousemove", updatePosition);
			window.addEventListener("mouseup", setPosition);
		}
	});

	function onCmpDown(e: MouseEvent) {
		e.preventDefault();

		if (id === null) {
			return;
		}

		mouseOffset = { x: e.offsetX, y: e.offsetY };
		grabbing = true;

		window.addEventListener("mousemove", updatePosition);
		window.addEventListener("mouseup", setPosition);
	}

	function handleDown(
		type: string,
		edge: string,
		handleIndex: number,
		e: MouseEvent,
	) {
		e.preventDefault();

		if (id === null) {
			return;
		}

		// calculate position of handle
		let x, y;
		if (["left", "right"].includes(edge)) {
			x = position.x + (edge == "right" ? GRID_SIZE * width : 0);
			y = position.y + GRID_SIZE * (handleIndex + 1);
		} else {
			x = position.x + GRID_SIZE * (handleIndex + 1);
			y = position.y + (edge == "bottom" ? GRID_SIZE * height : 0);
		}

		dispatch("createWire", {
			label: "test",
			input: {
				x: x,
				y: y,
				// if the handle was an output handle, the input of the new wire will be this component
				id: type === "output" ? id : -1,
			},
			output: {
				x: x,
				y: y,
				id: type === "input" ? id : -1,
			},
		});
	}

	function updatePosition(e: MouseEvent) {
		position.x = gridSnap(e.clientX - (mouseOffset?.x ?? 0));
		position.y = gridSnap(e.clientY - (mouseOffset?.y ?? 0));
	}

	function setPosition(e: MouseEvent) {
		if (id === null) {
			updatePosition(e);
			const cmd = new AddComponentCommand({
				label: label,
				type: type,
				size: size,
				position: position,
				inputs: inputs,
				outputs: outputs,
			});
			executeCommand(cmd);

			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseup", setPosition);
			dispatch("delete");
		} else {
			const cmd = new SetComponentPositionCommand(
				{
					x: gridSnap(e.clientX - (mouseOffset?.x ?? 0)),
					y: gridSnap(e.clientY - (mouseOffset?.y ?? 0)),
				},
				id,
			);
			executeCommand(cmd);

			mouseOffset = null;
			grabbing = false;

			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseup", setPosition);
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape" && id === null) {
			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseup", setPosition);
			dispatch("delete");
		}
	}
</script>

<svelte:window on:keydown={onKeyDown} />

<div
	class="wrapper"
	style="--x: {position.x}px; --y: {position.y}px; --width: {width}; --height: {height}; cursor: {cursor}"
>
	<!-- svelte-ignore a11y-interactive-supports-focus -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="contentWrapper" on:mousedown={onCmpDown}>
		{label} &centerdot; {type} &centerdot; id: {id}
	</div>
	{#each Object.entries(inputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="handle {position}"
				on:mousedown={(e) => handleDown("input", position, i, e)}
				style="--num: {handles.length}; --index: {i}"
				title={handle.type}
			>
				<div />
			</div>
		{/each}
	{/each}
	{#each Object.entries(outputs) as [position, handles]}
		{#each handles as handle, i}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="handle {position}"
				on:mousedown={(e) => handleDown("output", position, i, e)}
				style="--num: {handles.length}; --index: {i}"
				title={handle.type}
			>
				<div />
			</div>
		{/each}
	{/each}
</div>

<style lang="scss">
	.wrapper {
		--border-size: 2px;
		height: calc((var(--height)) * var(--grid-size) - var(--border-size));
		width: calc((var(--width)) * var(--grid-size) - var(--border-size));
		position: absolute;
		top: var(--y);
		left: var(--x);
		border: black var(--border-size) solid;
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
				left: calc(var(--grid-size) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.right {
				position: absolute;
				right: -16px;
				top: calc(var(--grid-size) * (var(--index) + 1));
				transform: translateY(-50%);
			}

			&.bottom {
				position: absolute;
				bottom: -16px;
				left: calc(var(--grid-size) * (var(--index) + 1));
				transform: translate(-50%);
			}

			&.left {
				position: absolute;
				left: -16px;
				top: calc(var(--grid-size) * (var(--index) + 1));
				transform: translateY(-50%);
			}
		}
	}
</style>

<script lang="ts">
	import { graph_store } from "$lib/stores/stores";
	import { GRID_SIZE, gridSnap, isClickOverSidebar } from "$lib/util/global";
	import {
		AddComponentCommand,
		executeCommand,
		MoveComponentCommand,
	} from "$lib/util/graph";
	import type {
		ComponentHandleList,
		HandleType,
		Edge,
		WireCreateEvent,
		XYPair,
	} from "$lib/util/types";
	import { createEventDispatcher, onMount } from "svelte";

	export let id: number | null;
	export let label: string = "Component";
	export let size: XYPair;
	export let type: string;
	export let position: XYPair;
	export let connections: ComponentHandleList;
	let height = size.y;
	let width = size.x;

	let mouseOffset: { x: number; y: number } | null;
	let grabbing = false;
	$: cursor = grabbing ? "grabbing" : "grab";

	const dispatch = createEventDispatcher<{
		wireCreate: WireCreateEvent;
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
		handleId: string,
		handleType: HandleType,
		handleEdge: Edge,
		handlePos: number,
		e: MouseEvent,
	) {
		e.preventDefault();

		if (id === null) {
			return;
		}

		// calculate position of handle
		let x, y;
		if (["left", "right"].includes(handleEdge)) {
			x = position.x + (handleEdge == "right" ? GRID_SIZE * width : 0);
			y = position.y + GRID_SIZE * handlePos;
		} else {
			x = position.x + GRID_SIZE * handlePos;
			y = position.y + (handleEdge == "bottom" ? GRID_SIZE * height : 0);
		}

		dispatch("wireCreate", {
			label: "test",
			input: {
				x: x,
				y: y,
				connection: null,
			},
			output: {
				x: x,
				y: y,
				connection: null,
			},
			wireStart: handleType === "input" ? "output" : "input",
			connection: {
				handleId: handleId,
				id: id,
			},
		});
	}

	function updatePosition(e: MouseEvent) {
		position.x = gridSnap(e.clientX - (mouseOffset?.x ?? 0));
		position.y = gridSnap(e.clientY - (mouseOffset?.y ?? 0));
	}

	function setPosition(e: MouseEvent) {
		if (isClickOverSidebar(e)) {
			return;
		}
		if (id === null) {
			updatePosition(e);
			const cmd = new AddComponentCommand({
				label: label,
				type: type,
				size: size,
				position: position,
				connections: connections,
			});
			executeCommand(cmd);

			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseup", setPosition);
			dispatch("delete");
		} else {
			const cmd = new MoveComponentCommand(
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
		if (e.key === "Escape") {
			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseup", setPosition);
			if (id === null) {
				dispatch("delete");
			} else {
				mouseOffset = null;
				grabbing = false;
				// trigger rerender
				graph_store.update((data) => data);
			}
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
	{#each Object.entries(connections) as [identifier, handle]}
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="handle {handle.edge}"
			on:mousedown={(e) =>
				handleDown(identifier, handle.type, handle.edge, handle.pos, e)}
			style="--pos: {handle.pos}"
			title={identifier}
			data-type={handle.type}
			data-has-connection={handle.connection !== null}
		>
			<div />
		</div>
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
		z-index: 1;

		&:not(.grabbed) {
			cursor: grab;
		}

		&:hover {
			.handle:not([data-type="input"][data-has-connection="true"]) {
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
				left: calc(var(--grid-size) * (var(--pos)));
				transform: translate(-50%);
			}

			&.right {
				position: absolute;
				right: -16px;
				top: calc(var(--grid-size) * (var(--pos)));
				transform: translateY(-50%);
			}

			&.bottom {
				position: absolute;
				bottom: -16px;
				left: calc(var(--grid-size) * (var(--pos)));
				transform: translate(-50%);
			}

			&.left {
				position: absolute;
				left: -16px;
				top: calc(var(--grid-size) * (var(--pos)));
				transform: translateY(-50%);
			}
		}
	}
</style>

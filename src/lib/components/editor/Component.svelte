<script lang="ts">
	import {
		AddAction,
		canvasViewModel,
		DeleteAction,
		editorViewModel,
	} from "$lib/util/actions.svelte";
	import { calculateHandlePosition, GRID_SIZE } from "$lib/util/global.svelte";
	import { RotationInfo } from "$lib/util/positioning";
	import { getSimData } from "$lib/util/simulation.svelte";
	import type {
		ComponentHandle,
		ComponentHandleList,
		ComponentType,
		HandleEdge,
		HandleType,
		SVGPointerEvent,
		XYPair,
	} from "$lib/util/types";
	import type {
		EditorUiState,
		TypedReference,
	} from "$lib/util/viewModels/editorViewModel.svelte";
	import { P } from "ts-pattern";
	import ComponentInner from "./ComponentInner.svelte";
	import Handle from "./Handle.svelte";

	type Props = {
		id: number;
		size: XYPair;
		type: ComponentType;
		position: XYPair;
		rotation: number;
		handles: ComponentHandleList;
		isPoweredInitially: boolean;
		uiState: EditorUiState;
	};
	let {
		id,
		size,
		type,
		position,
		rotation,
		handles,
		isPoweredInitially,
		uiState,
	}: Props = $props();

	let rect = $state<SVGRectElement>();

	let editingThis = $derived(
		uiState.matches({
			editType: P.union("draggingElements", "addingComponent"),
			clickedElement: { id, type: "component" },
		}),
	);

	let simulating = $derived(uiState.matches({ mode: "simulate" }));
	let simData = $derived(getSimData(id));

	let isSelected = $derived(editorViewModel.isSelectedId(id));

	let isPowered = $derived.by(() => {
		if (simulating) {
			const isAnyOutputPowered = Object.values(simData?.outputs ?? {}).some(
				(v) => v,
			);
			// A component is "powered" if it sends power to any output
			if (isAnyOutputPowered) {
				return true;
			}
			// LEDs don't have outputs, so there is an extra property
			if (simData?.ledPowered) {
				return true;
			}
		}
		if (isPoweredInitially) {
			return true;
		}
		return false;
	});

	let cursor = $derived.by(() => {
		if (editingThis) {
			if (uiState.matches({ editType: "draggingElements" })) {
				// If we are dragging this component, show grabbing cursor
				return "grabbing";
			} else {
				return "default";
			}
		} else {
			if (uiState.matches({ editType: "idle" })) {
				// If we are in idle mode, show grab cursor
				return "grab";
			} else {
				return "default";
			}
		}
	});

	function onHandleDown(
		handleId: string,
		handleType: HandleType,
		handleEdge: HandleEdge,
		handlePos: number,
		e: SVGPointerEvent,
	) {
		if (e.button !== 0) {
			return;
		}
		if (deletingThis) {
			// Because this element will be removed,
			// we need to remove the hovered element (this one)
			editorViewModel.removeHoveredElement();
			DeleteAction.deleteComponent(id);
			e.stopPropagation();
			return;
		}
		if (!uiState.matches({ editType: "idle" })) {
			return;
		}
		e.preventDefault();
		e.currentTarget.releasePointerCapture(e.pointerId);
		e.stopPropagation();

		editorViewModel.removeHoveredHandle();

		// calculate position of handle
		const wirePos = calculateHandlePosition(
			handleEdge,
			handlePos,
			size,
			position,
			rotation,
		);

		AddAction.addWire(wirePos, {
			id,
			handleId,
			handleType,
			type: "component",
		});
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) {
			return;
		}
		if (uiState.matches({ isPanning: true })) {
			// Disable any component interaction while panning
			return;
		}

		if (uiState.matches({ mode: "delete" })) {
			// Because this element will be removed,
			// we need to remove the hovered element (this one)
			editorViewModel.removeHoveredElement();
			DeleteAction.deleteComponent(id);
			e.stopPropagation();
			return;
		}
		if (!uiState.matches({ editType: "idle" })) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		const clickPosClient = { x: e.clientX, y: e.clientY };
		const clickPosSvg = canvasViewModel.clientToSVGCoords(clickPosClient);

		const self: TypedReference = {
			id,
			type: "component",
		};

		const clickType = e.ctrlKey || e.metaKey ? "ctrl" : "none";
		editorViewModel.onElementDown(self, clickPosSvg, clickType);
	}

	function onHandleEnter(handle: ComponentHandle, identifier: string) {
		if (
			!uiState.matches({
				mode: P.union("edit", "simulate", "delete"),
				isPanning: false,
			})
		) {
			return;
		}
		editorViewModel.setHoveredHandle({
			handleId: identifier,
			id: id,
			handleType: handle.type,
			type: "component",
		});
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	// If we are in delete mode, and either
	// - this component is being hovered
	// - a handle of this component is being hovered
	let deletingThis = $derived(
		uiState.matches({ mode: "delete" }) &&
			(uiState.hoveredElement === id || uiState.hoveredHandle?.id === id),
	);

	let fill = $derived(
		deletingThis
			? "var(--component-delete-color)"
			: "var(--component-background-color)",
	);

	let width = $derived(size.x * GRID_SIZE);
	let height = $derived(size.y * GRID_SIZE);

	let stroke = $derived(
		isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)",
	);

	let rotationInfo = $derived(
		new RotationInfo(rotation, {
			x: position.x + width / 2,
			y: position.y + height / 2,
		}),
	);
</script>

<rect
	bind:this={rect}
	role="button"
	tabindex="0"
	aria-label={type}
	class={["component-body", { selected: isSelected }]}
	data-testcomponenttype={type}
	data-testcomponentid={id}
	x={position.x}
	y={position.y}
	{width}
	{height}
	style="cursor: {cursor}"
	onpointerdown={onPointerDown}
	onpointerenter={() => {
		editorViewModel.setHoveredElement(id);
	}}
	onpointerleave={() => {
		editorViewModel.removeHoveredElement();
	}}
	{fill}
	{stroke}
	fill-opacity="70%"
	transform={rotationInfo.asRotate()}
/>

<ComponentInner
	componentId={id}
	x={position.x}
	y={position.y}
	{width}
	{height}
	{type}
	{isPowered}
	{uiState}
	{rotationInfo}
/>

{#each Object.entries(handles) as [identifier, handle]}
	<!-- Hide connected inputs -->
	{#if !(handle.connections.length !== 0 && handle.type === "input")}
		<!-- Hide handles of same type as dragged handle -->
		{#if !("draggedHandle" in uiState && uiState.draggedHandle.handleType === handle.type)}
			<!-- Hide inputs if the dragged handle already has outgoing wires
			 (wire outputs may only be connected to either 1 component input, or multiple wire inputs) -->
			{#if !("draggedHandle" in uiState && uiState.draggedHandle.handleType === "output" && (uiState.connectionCount ?? 0) > 0)}
				{@const handlePosition = calculateHandlePosition(
					handle.edge,
					handle.pos,
					size,
					position,
					rotation,
					false,
				)}

				<Handle
					{uiState}
					ref={{
						id: id,
						handleId: identifier,
						handleType: handle.type,
						type: "component",
					}}
					{editingThis}
					{deletingThis}
					{simulating}
					{simData}
					{isSelected}
					handleType={handle.type}
					position={handlePosition}
					onHandleDown={(e) =>
						onHandleDown(identifier, handle.type, handle.edge, handle.pos, e)}
					onHandleEnter={() => onHandleEnter(handle, identifier)}
					{onHandleLeave}
					{rotationInfo}
				/>
			{/if}
		{/if}
	{/if}
{/each}

<style lang="scss">
	@use "sass:math";
	@use "$lib/css/variables.scss" as *;

	$stroke-width: 2px;
	$outline-width: 2px;
	$corner-radius: 2px;

	.component-body {
		stroke-width: $stroke-width;
		rx: $corner-radius;
		border-radius: $corner-radius + math.div($stroke-width, 2);
	}

	.selected {
		outline: $outline-width solid var(--selected-outline-color);
	}

	@media (max-width: $mobile-breakpoint) {
		.component-body {
			// The border-radius is off by ~2px on mobile for some reason
			border-radius: $corner-radius + math.div($stroke-width, 2) - 2px;
		}
	}
</style>

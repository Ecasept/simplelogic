<script lang="ts">
	import {
		canvasViewModel,
		EditorAction,
		editorViewModel,
	} from "$lib/util/actions";
	import type {
		ComponentHandleList,
		ComponentType,
		XYPair,
	} from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";

	type Props = {
		id: number;
		size: XYPair;
		type: ComponentType;
		position: XYPair;
		rotation: number;
		handles: ComponentHandleList;
		isPoweredInitially: boolean;
		uiState: EditorUiState;
		customData?: Record<string, any>;
		centerTopLeft?: boolean;
	};
	let {
		id,
		type,
		position,
		rotation,
		uiState,
		customData,
		centerTopLeft,
	}: Props = $props();

	let text = $derived(customData?.text ?? "");
	let fontSize = $derived(customData?.fontSize ?? 16);

	let editingThis = $derived(uiState.matches({ componentId: id }));

	let isSelected = $derived("selected" in uiState && uiState.selected === id);

	let cursor = $derived.by(() => {
		if (editingThis) {
			if (uiState.matches({ editType: "draggingComponent" })) {
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
			EditorAction.deleteComponent(id);
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
		// Calculate offset between click position and top left corner of component
		const offset = {
			x: clickPosSvg.x - position.x,
			y: clickPosSvg.y - position.y,
		};
		editorViewModel.startMoveComponent(id, offset);
	}

	// If we are in delete mode, and either
	// - this component is being hovered
	// - a handle of this component is being hovered
	let deletingThis = $derived(
		uiState.matches({ mode: "delete" }) &&
			(uiState.hoveredElement === id || uiState.hoveredHandle?.id === id),
	);

	let textColor = $derived(
		deletingThis ? "var(--component-delete-color)" : "var(--on-primary-color)",
	);

	let rotateString = $derived(
		`rotate(${rotation} ${position.x} ${position.y})`,
	);

	let textAnchor = $derived(centerTopLeft ? "start" : "middle");
	let dominantBaseline = $derived(centerTopLeft ? "hanging" : "middle");
</script>

<text
	role="button"
	tabindex="0"
	aria-label={type}
	class={["component-body", { selected: isSelected }]}
	data-testcomponenttype={type}
	data-testcomponentid={id}
	x={position.x}
	y={position.y}
	style="cursor: {cursor}"
	onpointerdown={onPointerDown}
	onpointerenter={() => {
		editorViewModel.setHoveredElement(id);
	}}
	onpointerleave={() => {
		editorViewModel.removeHoveredElement();
	}}
	transform={rotateString}
	font-size={fontSize}
	fill={textColor}
	text-anchor={textAnchor}
	dominant-baseline={dominantBaseline}
>
	{text}
</text>

<!-- <circle cx={position.x} cy={position.y} r="1" /> -->

<style lang="scss">
	@use "sass:math";
	@import "$lib/css/variables.scss";

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

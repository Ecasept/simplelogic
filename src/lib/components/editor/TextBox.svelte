<script lang="ts">
	import {
		canvasViewModel,
		DeleteAction,
		editorViewModel,
	} from "$lib/util/actions.svelte";
	import { RotationInfo } from "$lib/util/positioning";
	import type {
		ComponentHandleList,
		ComponentType,
		XYPair,
	} from "$lib/util/types";
	import type {
		EditorUiState,
		TypedReference,
	} from "$lib/util/viewModels/editorViewModel.svelte";
	import { P } from "ts-pattern";

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
	};
	let { id, type, position, rotation, uiState, customData }: Props = $props();

	let text = $derived(customData?.text ?? "");
	let fontSize = $derived(customData?.fontSize ?? 16);
	let alignment = $derived(customData?.alignment ?? "center");

	let editingThis = $derived(
		uiState.matches({
			editType: P.union("draggingElements", "addingComponent"),
			clickedElement: { id, type: "component" },
		}),
	);

	let isSelected = $derived(editorViewModel.isSelectedId(id));

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

	let rotationInfo = $derived(
		new RotationInfo(rotation, { x: position.x, y: position.y }),
	);

	let textAnchor = $derived.by(() => {
		switch (alignment) {
			case "left":
				return "start";
			case "center":
				return "middle";
			case "right":
				return "end";
			default:
				return "center";
		}
	});
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
	transform={rotationInfo.asRotate()}
	font-size={fontSize}
	fill={textColor}
	text-anchor={textAnchor}
	dominant-baseline="middle"
>
	{#each text.split("\n") as line, i (i)}
		<tspan x={position.x} dy={i === 0 ? 0 : "1.2em"}>
			<!-- Use non-breaking space if line is empty to ensure line height is maintained -->
			{line || "\u00A0"}
		</tspan>
	{/each}
</text>

<!-- <circle cx={position.x} cy={position.y} r="1" /> -->

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

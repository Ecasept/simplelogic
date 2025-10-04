<script lang="ts">
	import {
		isComponentHandleRef,
		isVibrateSupported,
		isWireHandleRef,
	} from "$lib/util/global.svelte";
	import { RotationInfo } from "$lib/util/positioning";
	import type { SimulationData } from "$lib/util/simulation.svelte";
	import type {
		HandleReference,
		HandleType,
		SVGPointerEvent,
		XYPair,
	} from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { Tween } from "svelte/motion";
	type Props = {
		uiState: EditorUiState;
		ref: HandleReference;
		editingThis: boolean;
		deletingThis: boolean;
		simulating: boolean;
		simData: SimulationData | null;
		handleType: HandleType;
		position: XYPair;
		rotationInfo?: RotationInfo; // optional for wires (no rotation)
		isSelected?: boolean;
		onHandleDown: (event: SVGPointerEvent) => void;
		onHandleEnter: () => void;
		onHandleLeave: () => void;
	};

	let {
		uiState,
		ref: connection,
		editingThis,
		simulating,
		simData,
		handleType,
		position,
		deletingThis,
		onHandleDown,
		rotationInfo = new RotationInfo(0, { x: 0, y: 0 }),
		isSelected = false,
		onHandleEnter,
		onHandleLeave,
	}: Props = $props();

	let isHoveredHandle = $derived.by(() => {
		if (isComponentHandleRef(connection)) {
			return (
				isComponentHandleRef(uiState.hoveredHandle) &&
				uiState.hoveredHandle.id == connection.id &&
				uiState.hoveredHandle.handleId == connection.handleId
			);
		} else {
			return (
				isWireHandleRef(uiState.hoveredHandle) &&
				uiState.hoveredHandle.id == connection.id &&
				uiState.hoveredHandle.handleType == connection.handleType
			);
		}
	});

	let hoveringOtherWire = $derived(
		!isHoveredHandle && uiState.hoveredHandle !== null,
	);

	let editingOtherWire = $derived(
		"draggedHandle" in uiState &&
			uiState.draggedHandle.id != null &&
			!editingThis,
	);

	let editingThisHandle = $derived(
		"draggedHandle" in uiState &&
			uiState.draggedHandle.id === connection.id &&
			uiState.draggedHandle.handleId === connection.handleId,
	);

	let draggingOtherOnToThis = $derived(isHoveredHandle && editingOtherWire);
	// Can only be true for wires
	let draggingThisOnToOther = $derived(hoveringOtherWire && editingThisHandle);

	let identifier = $derived(
		isComponentHandleRef(connection)
			? connection.handleId
			: connection.handleType,
	);
	let simDataKey: "outputs" | "inputs" = $derived(
		handleType === "output" ? "outputs" : "inputs",
	);
	let isHandlePowered = $derived(simData?.[simDataKey]?.[identifier] ?? false);

	// If
	// - the user is dragging a wire from another component onto this handle
	//   or the user is dragging this wire onto another component,
	//   -> fill the handle with the connection color
	// - the user is simulating and the handle is powered
	//   -> fill the handle with the powered color
	// - the user is deleting this handle
	//   and the we are part of a wire
	//   (we don't want to change the color of component handles when hovering components in delete mode)
	//   -> fill the handle with the delete color

	let highlight = $derived(draggingOtherOnToThis || draggingThisOnToOther);

	let fill = $derived(
		highlight
			? "var(--handle-connect-color)"
			: (simulating && isHandlePowered) ||
				  (deletingThis && isWireHandleRef(connection))
				? "var(--component-delete-color)"
				: isSelected
					? "var(--selected-outline-color)"
					: "var(--component-outline-color)",
	);

	// If
	// - the user is hovering over this handle
	//   and we are not deleting this handle or simulation is active
	//   (handles are disabled when deleting or simulating)
	//   -> increase the radius of the handle
	// - the user is connecting to/from this handle
	//   -> increase the radius of the handle more
	let r = $derived(
		highlight ? 10 : isHoveredHandle && !(deletingThis || simulating) ? 6 : 5,
	);

	$effect(() => {
		// Vibrate when dragging a wire onto another handle
		if (isVibrateSupported()) {
			if (draggingOtherOnToThis) {
				navigator.vibrate(10);
			}
		}
	});

	function cubicBezier(p0: number, p1: number, p2: number, p3: number) {
		return (t: number) => {
			const u = 1 - t;
			const tt = t * t;
			const uu = u * u;
			return 3 * uu * t * p1 + 3 * u * tt * p2 + tt * t * p3;
		};
	}

	/** Animated radius for the handle symbol */
	const aR = new Tween(5, {
		duration: 100,
		easing: cubicBezier(0.19, 1, 0.22, 1),
	});

	$effect(() => {
		aR.set(r);
	});
</script>

<circle
	role="button"
	tabindex="0"
	class="handle"
	data-testconnectedcomponentid={connection.id}
	data-testhandleid={identifier}
	onpointerenter={() => {
		onHandleEnter();
	}}
	onpointerleave={onHandleLeave}
	cx={position.x}
	cy={position.y}
	{fill}
	{r}
	onpointerdown={(e) => onHandleDown(e)}
	style="pointer-events: {editingThis ? 'none' : 'inherit'};"
	transform={rotationInfo.asRotate()}
></circle>

{#snippet line(rotated: boolean, show: boolean)}
	<line
		class={["handle-symbol", { hidden: !show }]}
		x1={position.x - (rotated ? aR.current / 2 : 0)}
		y1={position.y - (rotated ? 0 : aR.current / 2)}
		x2={position.x + (rotated ? aR.current / 2 : 0)}
		y2={position.y + (rotated ? 0 : aR.current / 2)}
		stroke="var(--on-component-outline-color)"
		stroke-width={1}
		pointer-events="none"
		transform={rotationInfo.asTranslateFor(position)}
	></line>
{/snippet}

<!-- A "+" sign to indicate connection -->
{@render line(true, highlight)}
{@render line(false, highlight)}

{#if handleType === "input"}
	{@render line(false, !highlight)}
{:else}
	<circle
		class={["handle-symbol", { hidden: highlight }]}
		cx={position.x}
		cy={position.y}
		r={(3 * aR.current) / 5}
		fill="transparent"
		stroke-width={1}
		stroke="var(--on-component-outline-color)"
		pointer-events="none"
		transform={rotationInfo.asTranslateFor(position)}
	></circle>
{/if}

<style lang="scss">
	.handle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
	.handle-symbol {
		transition: opacity 0.1s cubic-bezier(0.19, 1, 0.22, 1);
		&.hidden {
			opacity: 0;
		}
	}
</style>

<script lang="ts">
	import {
		isComponentHandleRef,
		isWireHandleRef,
	} from "$lib/util/global.svelte";
	import type { SimulationData } from "$lib/util/simulation.svelte";
	import type {
		HandleReference,
		HandleType,
		SVGPointerEvent,
		XYPair,
	} from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	type Props = {
		uiState: EditorUiState;
		ref: HandleReference;
		editingThis: boolean;
		deletingThis: boolean;
		simulating: boolean;
		simData: SimulationData | null;
		handleType: HandleType;
		position: XYPair;
		rotateString?: string;
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
		rotateString = "",
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
	let fill = $derived(
		draggingOtherOnToThis || draggingThisOnToOther
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
	// - the user is dragging this wire onto another component
	//   -> increase the radius of the handle
	let r = $derived(
		(isHoveredHandle && !deletingThis && !simulating) || draggingThisOnToOther
			? 10
			: 5,
	);

	/** The position that the handle would be in when rotated with `rotateString`, but as a translation.
	 * Can be used to reposition an element without rotating it itself.
	 */
	const symbolPosition = $derived.by(() => {
		// Extract the three values from the rotateString
		const [rot, x, y] = rotateString
			.replace("rotate(", "")
			.replace(")", "")
			.split(" ")
			.map(Number);
		// rotate `position` around (x, y) by `rot` degrees
		const angle = (rot * Math.PI) / 180;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const dx = position.x - x;
		const dy = position.y - y;
		return {
			x: x + dx * cos - dy * sin,
			y: y + dx * sin + dy * cos,
		};
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
	transform={rotateString}
></circle>

{#if handleType === "input"}
	<line
		x1={position.x}
		y1={position.y - r / 2}
		x2={position.x}
		y2={position.y + r / 2}
		stroke="var(--on-component-outline-color)"
		stroke-width={1}
		pointer-events="none"
		transform="translate({symbolPosition.x - position.x}, {symbolPosition.y -
			position.y})"
	></line>
{:else}
	<circle
		cx={position.x}
		cy={position.y}
		r={(3 * r) / 5}
		fill="transparent"
		stroke-width={1}
		stroke="var(--on-component-outline-color)"
		pointer-events="none"
		transform={rotateString}
	></circle>
{/if}

<style lang="scss">
	circle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
</style>

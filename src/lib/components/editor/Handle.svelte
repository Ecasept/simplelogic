<script lang="ts">
	import {
		isComponentConnection,
		isWireConnection,
	} from "$lib/util/global.svelte";
	import type { SimulationData } from "$lib/util/simulation.svelte";
	import type {
		ComponentConnection,
		HandleType,
		SVGPointerEvent,
		WireConnection,
		XYPair,
	} from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	type Props = {
		uiState: EditorUiState;
		connection: WireConnection | ComponentConnection;
		editingThis: boolean;
		deletingThis: boolean;
		simulating: boolean;
		simData: SimulationData | null;
		handleType: HandleType;
		position: XYPair;
		rotateString?: string;
		onHandleDown: (event: SVGPointerEvent) => void;
		onHandleEnter: () => void;
		onHandleLeave: () => void;
	};

	let {
		uiState,
		connection,
		editingThis,
		simulating,
		simData,
		handleType,
		position,
		deletingThis,
		onHandleDown,
		rotateString = "",
		onHandleEnter,
		onHandleLeave,
	}: Props = $props();

	let isHoveredHandle = $derived.by(() => {
		if (isComponentConnection(connection)) {
			return (
				isComponentConnection(uiState.hoveredHandle) &&
				uiState.hoveredHandle.id == connection.id &&
				uiState.hoveredHandle.handleId == connection.handleId
			);
		} else {
			return (
				isWireConnection(uiState.hoveredHandle) &&
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

	let draggingOtherOnToThis = $derived(isHoveredHandle && editingOtherWire);
	// Can only be true for wires
	let draggingThisOnToOther = $derived(hoveringOtherWire && editingThis);

	let identifier = $derived(
		isComponentConnection(connection)
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
				  (deletingThis && isWireConnection(connection))
				? "var(--component-delete-color)"
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

<style lang="scss">
	circle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
</style>

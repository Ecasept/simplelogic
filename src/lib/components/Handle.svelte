<script lang="ts">
	import { isComponentConnection, isWireConnection } from "$lib/util/global";
	import type { SimulationData } from "$lib/util/simulation.svelte";
	import type {
		ComponentConnection,
		HandleType,
		WireConnection,
		XYPair,
	} from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	type Props = {
		uiState: EditorUiState;
		connection: WireConnection | ComponentConnection;
		editingThis: boolean;
		simulating: boolean;
		simData: SimulationData | null;
		handleType: HandleType;
		position: XYPair;
		onHandleDown: (event: PointerEvent) => void;
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
		onHandleDown,
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
		uiState.draggedWire?.id != null && !editingThis,
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
	r={isHoveredHandle || draggingThisOnToOther ? 10 : 5}
	fill={draggingOtherOnToThis || draggingThisOnToOther
		? "var(--handle-connect-color)"
		: simulating && isHandlePowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)"}
	onpointerdown={(e) => onHandleDown(e)}
	style="pointer-events: {editingThis ? 'none' : 'all'};"
></circle>

<style lang="scss">
	circle {
		transition:
			r 0.1s cubic-bezier(0.19, 1, 0.22, 1),
			fill 0.1s cubic-bezier(0.19, 1, 0.22, 1);
	}
</style>

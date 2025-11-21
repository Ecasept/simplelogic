<script lang="ts">
	import {
		AddAction,
		canvasViewModel,
		ChangesAction,
		DeleteAction,
		editorViewModel,
	} from "$lib/util/actions.svelte";
	import {
		debugLog,
		draggedHandleType,
		isComponentHandleRef,
		isElementPowered,
		isVibrateSupported,
	} from "$lib/util/global.svelte";
	import { startLongPressTimer } from "$lib/util/longpress";
	import { getSimData } from "$lib/util/simulation.svelte";
	import {
		newWireHandleRef,
		type HandleType,
		type SVGPointerEvent,
		type WireHandle,
	} from "$lib/util/types";
	import {
		type EditorUiState,
		type TypedReference,
	} from "$lib/util/viewModels/editorViewModel.svelte";
	import { P } from "ts-pattern";
	import Handle from "./Handle.svelte";

	type Props = {
		id: number;
		handles: {
			input: WireHandle;
			output: WireHandle;
		};
		uiState: EditorUiState;
		renderMode?: "body" | "handles" | "all";
	};

	let { id, handles, uiState, renderMode = "all" }: Props = $props();

	let editingThis = $derived(
		"draggedHandle" in uiState && uiState.draggedHandle.id === id,
	);
	let clickedThis = $derived(
		"clickedHandle" in uiState && uiState.clickedHandle.id === id,
	);

	let input = $derived(handles.input);
	let output = $derived(handles.output);

	let simulating = $derived(uiState.matches({ mode: "simulate" }));

	let simData = $derived(getSimData(id));

	let isSelected = $derived(editorViewModel.isSelectedId(id));

	let isPowered = $derived(
		simData ? simulating && isElementPowered(simData) : false,
	);

	if (id === 10) {
		$inspect(simData).with(debugLog(`Wire ${id} Simulation Data`));
	}
	function onHandleLongPress(handle: WireHandle, handleType: HandleType) {
		if (handleType === "input" && handle.connections.length > 0) {
			// Cannot start a new wire from an input that already has a connection
			return;
		}

		// Add new wire instead of moving existing one on long press
		// Abort the previous move wire action
		ChangesAction.abortEditing();

		if (isVibrateSupported()) {
			navigator.vibrate(10);
		}
		AddAction.addWire(
			{
				x: handle.x,
				y: handle.y,
			},
			newWireHandleRef(id, handleType),
		);
	}

	function onPointerDown(e: SVGPointerEvent) {
		if (e.button !== 0) {
			return;
		}

		if (deletingThis) {
			// Because this element will be removed,
			// we need to remove the hovered element (this one)
			editorViewModel.removeHoveredElement();
			DeleteAction.deleteWire(id);
			e.stopPropagation();
			return;
		}
		if (!uiState.matches({ editType: "idle" })) {
			return;
		}
		e.preventDefault();
		e.currentTarget.releasePointerCapture(e.pointerId);
		e.stopPropagation();

		const clickPosClient = { x: e.clientX, y: e.clientY };
		const clickPosSvg = canvasViewModel.clientToSVGCoords(clickPosClient);

		const self: TypedReference = {
			id,
			type: "wire",
		};

		const clickType = e.ctrlKey || e.metaKey ? "ctrl" : "none";
		editorViewModel.onElementDown(self, clickPosSvg, clickType);
	}

	function onHandleDown(clickedHandle: HandleType, e: SVGPointerEvent) {
		if (e.button !== 0) {
			return;
		}
		if (deletingThis) {
			// Because this element will be removed,
			// we need to remove the hovered element (this one)
			editorViewModel.removeHoveredElement();
			DeleteAction.deleteWire(id);
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

		const handle = clickedHandle === "input" ? input : output;

		startLongPressTimer({ x: e.clientX, y: e.clientY }, () => {
			onHandleLongPress(handle, clickedHandle);
		});

		// If shift is held, add a new wire instead of moving existing one
		// Only works for output handles, or input handles with no connections
		if (
			e.shiftKey &&
			(clickedHandle === "output" || handle.connections.length === 0)
		) {
			AddAction.addWire(
				{
					x: handle.x,
					y: handle.y,
				},
				newWireHandleRef(id, clickedHandle),
			);
		} else {
			const clickType = e.ctrlKey || e.metaKey ? "ctrl" : "none";
			editorViewModel.onWireHandleDown(
				newWireHandleRef(id, clickedHandle),
				{
					x: handle.x,
					y: handle.y,
				},
				handle.connections.length,
				clickType,
			);
		}
	}

	function onHandleEnter(handleType: HandleType) {
		if (
			!uiState.matches({
				mode: P.union("edit", "simulate", "delete"),
				isPanning: false,
			})
		) {
			return;
		}

		editorViewModel.setHoveredHandle(newWireHandleRef(id, handleType));
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	// If we are in delete mode, and either
	// - this wire is being hovered
	// - a handle of this wire is being hovered
	let deletingThis = $derived(
		uiState.matches({ mode: "delete" }) &&
			(uiState.hoveredElement === id || uiState.hoveredHandle?.id === id),
	);

	let stroke = $derived(
		deletingThis || isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)",
	);

	let hitboxEnabled = $derived(
		uiState.matches({ mode: "delete" }) ||
			uiState.matches({ editType: "idle" }),
	);
</script>

{#if renderMode === "body" || renderMode === "all"}
	<path
		class={{ wire: true, selected: isSelected }}
		d="M{input.x} {input.y} L{output.x} {output.y}"
		{stroke}
		style="pointer-events: none;"
		data-testcomponenttype="wire"
		data-testcomponentid={id}
	></path>

	<path
		role="button"
		tabindex="0"
		class="hitbox"
		d="M{input.x} {input.y} L{output.x} {output.y}"
		stroke="transparent"
		style="pointer-events: {hitboxEnabled ? 'inherit' : 'none'};"
		stroke-width="10"
		onpointerenter={() => {
			editorViewModel.setHoveredElement(id);
		}}
		onpointerleave={() => {
			editorViewModel.removeHoveredElement();
		}}
		onpointerdown={onPointerDown}
	></path>
{/if}

{#if renderMode === "handles" || renderMode === "all"}
	<!-- Hide connected inputs -->
	{#if input.connections.length === 0}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		{#if !(!editingThis && !clickedThis && draggedHandleType(uiState, "input"))}
			<Handle
				{uiState}
				ref={newWireHandleRef(id, "input")}
				{editingThis}
				{deletingThis}
				{simulating}
				{simData}
				{isSelected}
				handleType="input"
				position={{ x: input.x, y: input.y }}
				onHandleDown={(e) => onHandleDown("input", e)}
				onHandleEnter={() => onHandleEnter("input")}
				{onHandleLeave}
			/>
		{/if}
	{/if}
	<!-- Hide outputs connected to components -->
	{#if !isComponentHandleRef(output.connections[0] ?? null)}
		<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
		{#if !(!editingThis && !clickedThis && draggedHandleType(uiState, "output"))}
			<Handle
				{uiState}
				ref={newWireHandleRef(id, "output")}
				{editingThis}
				{deletingThis}
				{simulating}
				{simData}
				{isSelected}
				handleType="output"
				position={{ x: output.x, y: output.y }}
				onHandleDown={(e) => onHandleDown("output", e)}
				onHandleEnter={() => onHandleEnter("output")}
				{onHandleLeave}
			/>
		{/if}
	{/if}
{/if}

<style>
	.wire {
		stroke-linecap: round;
	}
	.selected {
		stroke: var(--selected-outline-color);
	}
</style>

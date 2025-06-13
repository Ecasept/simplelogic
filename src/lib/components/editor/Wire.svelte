<script lang="ts">
	import { EditorAction, editorViewModel } from "$lib/util/actions";
	import {
		isComponentHandleRef,
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
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { P } from "ts-pattern";
	import Handle from "./Handle.svelte";

	type Props = {
		id: number;
		handles: {
			input: WireHandle;
			output: WireHandle;
		};
		uiState: EditorUiState;
	};

	let { id, handles, uiState }: Props = $props();

	let editingThis = $derived(
		"draggedHandle" in uiState && uiState.draggedHandle.id === id,
	);

	let input = $derived(handles.input);
	let output = $derived(handles.output);

	let simulating = $derived(uiState.matches({ mode: "simulate" }));

	let simData = $derived(getSimData(id));

	let isSelected = $derived("selected" in uiState && uiState.selected === id);

	let isPowered = $derived.by(() => {
		const isOutputPowered = simData?.outputs["output"] ?? false;
		return simulating && isOutputPowered;
	});

	function onHandleLongPress(handle: WireHandle, handleType: HandleType) {
		// Add new wire instead of moving existing one on long press
		// Abort the previous move wire action
		editorViewModel.abortEditing();

		if (isVibrateSupported()) {
			navigator.vibrate(10);
		}
		EditorAction.addWire(
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
			EditorAction.deleteWire(id);
			e.stopPropagation();
			return;
		}
		if (!uiState.matches({ editType: "idle" })) {
			return;
		}
		e.preventDefault();
		e.currentTarget.releasePointerCapture(e.pointerId);
		e.stopPropagation();

		editorViewModel.startDragWireMiddle(id);
	}

	function onHandleDown(clickedHandle: HandleType, e: SVGPointerEvent) {
		if (e.button !== 0) {
			return;
		}
		if (deletingThis) {
			// Because this element will be removed,
			// we need to remove the hovered element (this one)
			editorViewModel.removeHoveredElement();
			EditorAction.deleteWire(id);
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

		if (clickedHandle === "output") {
			startLongPressTimer({ x: e.clientX, y: e.clientY }, () => {
				onHandleLongPress(handle, clickedHandle);
			});
		}

		if (e.shiftKey && clickedHandle === "output") {
			EditorAction.addWire(
				{
					x: handle.x,
					y: handle.y,
				},
				newWireHandleRef(id, clickedHandle),
			);
		} else {
			editorViewModel.startMoveWire(
				newWireHandleRef(id, clickedHandle),
				handle.connections.length,
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
			uiState.matches({ editType: P.union("idle", "draggingWireMiddle") }),
	);
</script>

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

<!-- Hide connected inputs -->
{#if input.connections.length === 0}
	<!-- Hide handles of same type as dragged handle (but not dragged handle itself) -->
	{#if !(!editingThis && "draggedHandle" in uiState && uiState.draggedHandle.handleType === "input")}
		<Handle
			{uiState}
			ref={newWireHandleRef(id, "input")}
			{editingThis}
			{deletingThis}
			{simulating}
			{simData}
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
	{#if !(!editingThis && "draggedHandle" in uiState && uiState.draggedHandle?.handleType === "output")}
		<Handle
			{uiState}
			ref={newWireHandleRef(id, "output")}
			{editingThis}
			{deletingThis}
			{simulating}
			{simData}
			handleType="output"
			position={{ x: output.x, y: output.y }}
			onHandleDown={(e) => onHandleDown("output", e)}
			onHandleEnter={() => onHandleEnter("output")}
			{onHandleLeave}
		/>
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

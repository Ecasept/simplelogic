<script lang="ts">
	import type { HandleType, WireHandle } from "$lib/util/types";
	import { type EditorUiState } from "$lib/util/viewModels/editorViewModel";
	import { editorViewModel } from "$lib/util/actions";

	export let id: number;
	export let label: string;
	export let input: WireHandle;
	export let output: WireHandle;

	export let uiState: EditorUiState;

	$: editingThis = uiState.id === id;
	$: editing = uiState.state !== null;

	function onHandleDown(clickedHandle: HandleType, e: MouseEvent) {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		editorViewModel.removeHoveredHandle();
		e.preventDefault();
		e.stopPropagation();
		editorViewModel.startMoveWire(id, clickedHandle);
	}

	function onHandleEnter(handleType: HandleType) {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		editorViewModel.setHoveredHandle({ handleType: handleType, id: id });
	}

	function onHandleLeave() {
		editorViewModel.removeHoveredHandle();
	}

	let hoverR = 5;
	let hoveredHandle: string | null = null;
	$: {
		if (editing) {
			// Adding/moving something else
			hoverR = 20;
		} else {
			// Not adding/moving anything
			hoverR = 10;
		}
		if (
			uiState.hoveredHandle !== null &&
			id === uiState.hoveredHandle.id &&
			"handleType" in uiState.hoveredHandle
		) {
			hoveredHandle = uiState.hoveredHandle.handleType;
		} else {
			hoveredHandle = null;
		}
	}
</script>

<path
	d="M{input.x + 1} {input.y + 1} L{output.x + 1} {output.y + 1}"
	stroke="black"
	fill="none"
	style="pointer-events: {editingThis ? 'none' : 'all'};"
></path>
{#if input.connection === null}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle
		on:mouseenter={() => {
			onHandleEnter("input");
		}}
		on:mouseleave={onHandleLeave}
		class="handle"
		cx={input.x}
		cy={input.y}
		r={hoveredHandle === "input" ? hoverR : 5}
		style="pointer-events: {editingThis ? 'none' : 'all'};"
		on:mousedown={(e) => onHandleDown("input", e)}
	></circle>
{/if}
{#if !(output.connection !== null && "handleId" in output.connection)}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<circle
		on:mouseenter={() => {
			onHandleEnter("output");
		}}
		on:mouseleave={onHandleLeave}
		class="handle"
		cx={output.x}
		cy={output.y}
		r={hoveredHandle === "output" ? hoverR : 5}
		style="pointer-events: {editingThis ? 'none' : 'all'};"
		on:mousedown={(e) => onHandleDown("output", e)}
	></circle>
{/if}

<!--
Here's a comprehensive list of potential edge cases for your logic gate simulator:

1. Component-related edge cases:
   - Components placed exactly on top of each other
   - Components partially overlapping
   - Components placed at the edge of the grid
   - Maximum number of components placed on the grid
   - Attempting to place a component outside the grid

2. Handle-related edge cases:
   - Handles of adjacent components overlapping
   - Multiple handles occupying the same grid space
   - Handles positioned at the edge of the grid
   - Handles obscured by other components

3. Wire-related edge cases:
   - Attempting to create a wire from a handle that already has a wire
   - Dragging a wire outside the grid boundaries
   - Crossing wires over components or other wires
   - Creating a wire with zero length (start and end at the same point)
   - Maximum wire length reached
   - Minimum wire length (preventing extremely short connections)

4. Connection-related edge cases:
   - Connecting a wire to its own source handle
   - Connecting multiple wires to a single handle
   - Connecting a wire to a handle that already has a connection
   - Connecting wires between incompatible component types
   - Creating loops or circular connections
   - Connecting inputs to inputs or outputs to outputs

5. Interaction-related edge cases:
   - Clicking on overlapping handles or components
   - Dragging a wire through a handle without connecting
   - Releasing the mouse button while dragging a wire (not over a handle)
   - Double-clicking on a handle or component
   - Right-clicking on various elements (handles, wires, components)
   - Attempting to interact with elements behind other elements

6. Grid-related edge cases:
   - Snapping components or wires to grid points
   - Handling fractional grid positions
   - Zooming in/out and its effect on component/wire placement

7. Undo/Redo-related edge cases:
   - Undoing a connection that affects multiple components
   - Redoing a deleted component with its connections
   - Undo/redo actions involving overlapping components

8. Performance-related edge cases:
   - Handling a large number of components and wires
   - Updating the simulation with complex circuits
   - Rendering overlapping components and wires efficiently

9. Multi-select and group operations:
   - Selecting multiple overlapping components
   - Moving a group of connected components
   - Copying and pasting overlapping components with their connections

10. Saving and loading:
    - Saving a circuit with overlapping components
    - Loading a circuit that was created with a different grid size or resolution

11. Component-specific edge cases:
    - Handling components with multiple inputs or outputs
    - Dealing with components that have internal states (e.g., flip-flops)
    - Managing components with different sizes on the grid

12. Simulation-specific edge cases:
    - Handling race conditions in the circuit
    - Dealing with oscillating or unstable circuits
    - Managing propagation delays in complex circuits

This list covers a wide range of potential edge cases for your logic gate simulator. Considering and handling these cases will help improve the robustness and user experience of your application.

Thank you for providing that context about your logic gate simulator. Here's a comprehensive list of potential edge cases related to the wire connection feature you've implemented:

1. Overlapping handles:
   - As you mentioned, when components are adjacent, their handles may overlap.
   - Multiple overlapping handles from different components in close proximity.

2. Self-connection:
   - As you noted, attempting to connect a wire to the same handle it originated from.

3. Multiple connections to a single handle:
   - Trying to connect multiple wires to the same input or output handle.
   - Attempting to connect a wire to a handle that already has a connection.

4. Disconnection and reconnection:
   - Disconnecting a wire and immediately trying to reconnect it to the same handle.
   - Rapidly connecting and disconnecting wires to the same handle.

5. Wire crossing and overlapping:
   - Wires crossing over each other, potentially causing visual confusion.
   - Multiple wires overlapping exactly, making it difficult to select a specific wire.

6. Connection to moving components:
   - Connecting a wire to a component that is being moved simultaneously.
   - Dragging a component with connected wires and how it affects the wire's path.

7. Grid alignment:
   - Connecting wires to handles that are not perfectly aligned with the grid.
   - Snapping behavior when connecting wires near grid intersections.

8. Component stacking:
   - Connecting wires to components that are stacked on top of each other.
   - Determining which component's handle takes precedence when stacked.

9. Wire length limitations:
   - Attempting to create a wire connection that exceeds the maximum allowed length.
   - Creating a wire with zero or near-zero length.

10. Undo/Redo operations:
    - Undoing a wire connection and its effect on the connected components.
    - Redoing a previously undone wire connection.

11. Component rotation:
    - Connecting wires to components that can be rotated, and how rotation affects connections.

12. Invalid connections:
    - Attempting to connect outputs to outputs or inputs to inputs.
    - Connecting components that are incompatible in terms of signal type or logic.

13. Multi-select and bulk operations:
    - Selecting multiple wires and attempting to connect them simultaneously.
    - Copying and pasting components with wire connections.

14. Zooming and scaling:
    - Connecting wires when the view is zoomed in or out significantly.
    - How wire connections behave when scaling the entire circuit.

15. Handle visibility:
    - Connecting to handles that may be partially obscured by other components or wires.

16. Delayed or laggy input:
    - Handling connection attempts when there's input lag or processing delay.

17. Touch or multi-touch input:
    - Connecting wires using touch input on devices with less precise control.
    - Handling multi-touch gestures while connecting wires.

18. Component deletion:
    - Behavior of connected wires when a component is deleted.
    - Attempting to connect a wire to a component that is in the process of being deleted.

19. Circuit boundaries:
    - Connecting wires to components at the edge of the allowed circuit area.
    - Behavior when dragging a wire outside the circuit boundaries.

20. Large-scale operations:
    - Performance and behavior when connecting wires in a circuit with hundreds or thousands of components.

Would you like me to elaborate on any of these edge cases or discuss potential solutions for handling them?
  -->

output to output viceversa wires on top of each other but mouse not on top

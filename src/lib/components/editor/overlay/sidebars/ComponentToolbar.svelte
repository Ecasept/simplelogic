<script lang="ts">
	import Component from "$lib/components/editor/Component.svelte";
	import { editorViewModel } from "$lib/util/actions";
	import { COMPONENT_DATA, GRID_SIZE } from "$lib/util/global.svelte";
	import type { ComponentType, SVGPointerEvent } from "$lib/util/types";

	type Props = {
		onPointerDown: (type: ComponentType, e: SVGPointerEvent) => void;
	};
	let { onPointerDown }: Props = $props();

	// Make a copy of the uiState to prevent reactivity
	// (we can't snapshot functions so we just copy it over)
	const uiState = {
		...$state.snapshot(editorViewModel.uiState),
		matches: editorViewModel.uiState.matches,
	};
</script>

<div class="toolbar">
	{#each Object.keys(COMPONENT_DATA) as Array<keyof typeof COMPONENT_DATA> as type}
		<svg
			aria-label="Add {type}"
			viewBox={`-5 -5 ${COMPONENT_DATA[type].width * GRID_SIZE + 10} ${COMPONENT_DATA[type].height * GRID_SIZE + 10}`}
			onpointerdown={(e) => {
				e.preventDefault();
				e.currentTarget.releasePointerCapture(e.pointerId);
				onPointerDown(type, e);
			}}
			class="component-svg"
		>
			<g class="component-container">
				<Component
					id={-1}
					size={{
						x: COMPONENT_DATA[type].width,
						y: COMPONENT_DATA[type].height,
					}}
					{type}
					position={{ x: 0, y: 0 }}
					handles={COMPONENT_DATA[type].handles}
					{uiState}
					isPoweredInitially={false}
					rotation={0}
				/>
			</g>
		</svg>
	{/each}
</div>

<style lang="scss">
	.component-container {
		// Disable pointer events on the component container
		pointer-events: none;
	}

	.component-svg {
		width: 100px;
		height: 100px;
		cursor: grab;
		touch-action: none;
	}

	#collapse-icon {
		height: 20px;
		transition: transform 0.3s;
		transform: rotate(180deg);
		&.collapsed {
			transform: rotate(0deg);
		}
	}

	.toolbar {
		display: grid;
		grid-template-columns: repeat(auto-fit, 100px);
		justify-content: center;
		gap: 10px;
	}
</style>

<script lang="ts">
	import { editorViewModel } from "$lib/util/actions";
	import { COMPONENT_DATA, GRID_SIZE } from "$lib/util/global";
	import type { ComponentType } from "$lib/util/types";
	import { ChevronDown } from "lucide-svelte";
	import Component from "./Component.svelte";

	type Props = {
		onPointerDown: (type: ComponentType, e: MouseEvent) => void;
	};
	let { onPointerDown }: Props = $props();

	let collapsed = $state(false);

	function toggle(e: MouseEvent) {
		collapsed = !collapsed;
	}
</script>

<div class="toolbar">
	<button id="collapse" aria-label="Show components" onclick={toggle}>
		Show components
		<div id="collapse-icon" class={[collapsed && "collapsed"]}>
			<ChevronDown size="20px" />
		</div>
	</button>
	<div class={["buttons-container", collapsed && "collapsed"]}>
		{#each Object.keys(COMPONENT_DATA) as Array<keyof typeof COMPONENT_DATA> as type}
			<svg
				aria-label="Add {type}"
				viewBox={`-5 -5 ${COMPONENT_DATA[type].width * GRID_SIZE + 10} ${COMPONENT_DATA[type].height * GRID_SIZE + 10}`}
				onpointerdown={(e) => {
					e.preventDefault();
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
						uiState={editorViewModel.uiState}
						isPoweredInitially={false}
					/>
				</g>
			</svg>
		{/each}
	</div>
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

	#collapse {
		border-radius: 50vh;
		border: none;
		background-color: var(--primary-container-color);
		margin: 10px;
		width: calc(100% - 20px); // 100% - 2 * margin
		color: var(--on-primary-container-color);
		padding: 5px;

		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		cursor: pointer;
	}
	#collapse-icon {
		height: 20px;
		transition: transform 0.3s;
		transform: rotate(180deg);
		&.collapsed {
			transform: rotate(0deg);
		}
	}

	.buttons-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, 100px);
		justify-content: center;
		gap: 10px;

		// How the animation works:
		// when collapsed
		// - height is animated from auto to 0
		// - allow-discrete sets display to none at the end of animation
		// when opened
		// - height is animated from 0 to auto
		// - allow-discrete sets display to grid at the end of animation

		// NOTE: most of this is chrome-only currently
		// see compatibility here:
		// https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size
		// https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style

		// how interpolate-size works:
		// https://developer.chrome.com/blog/new-in-chrome-129#animate

		transition:
			height 0.3s,
			display 0.3s;
		// Allow display to be animated
		transition-behavior: allow-discrete;
		// Allow height: auto to be animated
		interpolate-size: allow-keywords;

		// Hide elements that overflow when animating height
		// eg. when opening and height is 5px,
		// we don't want to show anything that would extend beyond 5px
		overflow: hidden;

		// On initial render (which is also the case when an element
		// switches from display: none to display: grid)
		// transitions don't know the previous value of height
		// so we need to set it to 0
		@starting-style {
			height: 0;
		}

		&.collapsed {
			height: 0;
			display: none;
		}
	}
</style>

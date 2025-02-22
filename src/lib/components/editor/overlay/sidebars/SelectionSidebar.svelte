<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { EditorAction } from "$lib/util/actions";
	import { simulation } from "$lib/util/simulation.svelte";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { ChevronDown, Play, RotateCcw, RotateCw, Trash } from "lucide-svelte";
	import { P } from "ts-pattern";

	const { uiState } = $props<{ uiState: EditorUiState }>();

	let open = $state(false);

	function toggle() {
		open = !open;
	}
</script>

{#if uiState.matches({ selected: P.number })}
	{#if uiState.matches({ mode: "edit" })}
		{@const label = open ? "Collapse" : "Expand"}
		<div class="sidebar">
			<button class="header" aria-label={label} title={label} onclick={toggle}>
				<h3>Tools</h3>
				<div class={["button-container", { open }]}>
					<ChevronDown size="24px" aria-label={open ? "Collapse" : "Expand"} />
				</div>
			</button>
			<div class={{ "sidebar-content": true, collapsed: !open }}>
				<Button
					title="Rotate clockwise 90 degrees"
					onClick={() => EditorAction.rotateComponent(90)}
					icon={RotateCw}
				/>
				<Button
					title="Rotate counter-clockwise 90 degrees"
					onClick={() => EditorAction.rotateComponent(-90)}
					icon={RotateCcw}
				/>
				<Button
					title="Delete"
					onClick={() => EditorAction.deleteSelected()}
					icon={Trash}
				/>
			</div>
		</div>
	{:else if uiState.matches({ mode: "simulate" })}
		{@const label = open ? "Collapse" : "Expand"}
		<div class="sidebar">
			<button class="header" aria-label={label} title={label} onclick={toggle}>
				<h3>Tools</h3>
				<div class={["button-container", { open }]}>
					<ChevronDown size="24px" aria-label={open ? "Collapse" : "Expand"} />
				</div>
			</button>
			<div class={{ "sidebar-content": true, collapsed: !open }}>
				<Button
					title="Simulate"
					text="Simulate"
					onClick={() => simulation.startSimulation()}
					icon={Play}
				/>
			</div>
		</div>
	{/if}
{/if}

<style lang="scss">
	h3 {
		margin: 5px;
	}
	.sidebar {
		background-color: var(--surface-color);
		color: var(--on-surface-color);
		border-radius: var(--default-border-radius);
		padding: 10px;
		border: 1px solid var(--surface-border-color);
		width: 250px;
	}
	.button-container {
		line-height: 0;
		transform: rotate(0deg);
		transition: transform 0.3s;

		&.open {
			transform: rotate(180deg);
		}
	}

	.sidebar-content {
		:global(> *:first-child) {
			// add margin to the first child, because adding margin to this element
			// messes up the height animation
			margin-top: 10px;
		}
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

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: inherit;
		color: inherit;
		border: none;
		width: 100%;
		padding: 0;
		cursor: pointer;
	}
</style>

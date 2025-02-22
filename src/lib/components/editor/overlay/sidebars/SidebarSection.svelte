<script lang="ts">
	import { ChevronDown } from "lucide-svelte";
	import type { Snippet } from "svelte";

	type Props = {
		text: string;
		children: Snippet;
	};
	let { text, children }: Props = $props();

	let collapsed = $state(false);

	function toggle(e: MouseEvent) {
		collapsed = !collapsed;
	}
</script>

<div class="toolbar">
	<button id="collapse" aria-label={text} onclick={toggle}>
		{text}
		<div id="collapse-icon" class={{ collapsed }}>
			<ChevronDown size="20px" />
		</div>
	</button>
	<div class={["container", { collapsed }]}>
		{@render children()}
	</div>
</div>

<style lang="scss">
	#collapse {
		border-radius: 100vmin;
		border: none;
		background-color: var(--primary-container-color);
		width: 100%;
		margin-bottom: 10px;
		margin-top: 10px;
		color: var(--on-primary-container-color);
		padding: 5px;

		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.container {
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

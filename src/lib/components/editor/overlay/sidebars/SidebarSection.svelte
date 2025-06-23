<script lang="ts">
	import {
		collapseAnimation,
		collapseAnimationInit,
	} from "$lib/util/global.svelte";
	import { ChevronDown } from "lucide-svelte";
	import type { Snippet } from "svelte";

	type Props = {
		text: string;
		children: Snippet;
	};
	let { text, children }: Props = $props();

	let open = $state(true);

	function toggle() {
		open = !open;
	}

	let sidebarContent: HTMLDivElement | null = null;
	let currentAnimation: Animation | null = null;

	function onToggle() {
		if (currentAnimation) {
			currentAnimation.cancel();
			currentAnimation = null;
		}

		if (sidebarContent) {
			const animation = collapseAnimation(sidebarContent, open);
			currentAnimation = animation;
			animation.onfinish = () => {
				currentAnimation = null;
			};
		}
		toggle();
	}

	// Generate unique IDs for ARIA attributes
	const contentId = `sidebar-content-${crypto.randomUUID()}`;
</script>

<div class="toolbar" role="region" aria-label={text}>
	<button
		aria-label={open ? "Collapse section" : "Expand section"}
		aria-expanded={open}
		aria-controls={contentId}
		onclick={onToggle}
		class="collapse-button"
	>
		{text}
		<div class={["collapse-icon", { open }]} aria-hidden="true">
			<ChevronDown size="20px" />
		</div>
	</button>
	<div
		id={contentId}
		bind:this={sidebarContent}
		style={collapseAnimationInit(open)}
		class="sidebar-section-content"
		aria-hidden={!open}
	>
		<div class="fixed-margin"></div>
		{@render children()}
	</div>
</div>

<style lang="scss">
	.fixed-margin {
		height: 10px;
	}
	.collapse-button {
		border-radius: 100vmin;
		border: none;
		background-color: var(--primary-container-color);
		width: 100%;
		margin-top: 10px;
		color: var(--on-primary-container-color);
		padding: 5px;

		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		cursor: pointer;
	}
	.collapse-icon {
		height: 20px;
		transition: transform 0.2s;
		&.open {
			transform: rotate(180deg);
		}
	}

	.sidebar-section-content {
		overflow: hidden;
	}
</style>

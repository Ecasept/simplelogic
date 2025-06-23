<script lang="ts">
	import {
		collapseAnimation,
		collapseAnimationInit,
	} from "$lib/util/global.svelte";
	import { ChevronDown } from "lucide-svelte";
	import type { Snippet } from "svelte";

	type Props = {
		headerText: string;
		/** A unique identifier for the sidebar */
		uniqueName: string;
		toggle: () => void;
		open: boolean;
		children: Snippet;
	};

	let { headerText, uniqueName, toggle, open, children }: Props = $props();

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
</script>

<div
	class="editor-overlay sidebar"
	id="sidebar-{uniqueName}"
	role="region"
	aria-label={headerText}
>
	<button
		class="header"
		aria-label={open ? "Collapse" : "Expand"}
		title={open ? "Collapse" : "Expand"}
		onclick={onToggle}
		aria-expanded={open}
		aria-controls="sidebar-{uniqueName}-content"
	>
		<h3>{headerText}</h3>
		<div class={["button-container", { open }]} aria-hidden="true">
			<ChevronDown size="24px" />
		</div>
	</button>
	<div
		id="sidebar-{uniqueName}-content"
		class={["sidebar-content", { collapsed: !open }]}
		bind:this={sidebarContent}
		style={collapseAnimationInit(open)}
		aria-hidden={!open}
	>
		<div class="content-container">
			{@render children()}
		</div>
	</div>
</div>

<style lang="scss">
	h3 {
		margin: 5px;
	}

	.content-container {
		margin-top: 10px;
		margin-left: 5px;
		margin-right: 5px;
		margin-bottom: 5px;
	}

	.sidebar {
		padding: 10px;
		width: 250px;
	}

	.button-container {
		line-height: 0;
		transform: rotate(0deg);
		transition: transform 0.2s;

		&.open {
			transform: rotate(180deg);
		}
	}

	.sidebar-content {
		overflow: hidden;
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

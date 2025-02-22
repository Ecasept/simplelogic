<script lang="ts">
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
</script>

<div class="sidebar sidebar-{uniqueName}">
	<button
		class="header"
		aria-label={open ? "Collapse" : "Expand"}
		title={open ? "Collapse" : "Expand"}
		onclick={toggle}
		aria-expanded={open}
		aria-controls="sidebar-{uniqueName}-content"
	>
		<h3>{headerText}</h3>
		<div class={["button-container", { open }]}>
			<ChevronDown size="24px" aria-label={open ? "Collapse" : "Expand"} />
		</div>
	</button>
	<div
		id="sidebar-{uniqueName}-content"
		class={["sidebar-content", { collapsed: !open }]}
	>
		<div class="fixed-margin"></div>
		{@render children()}
	</div>
</div>

<style lang="scss">
	h3 {
		margin: 5px;
	}

	.fixed-margin {
		margin: 10px;
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
		transition:
			height 0.3s,
			display 0.3s;
		transition-behavior: allow-discrete;
		interpolate-size: allow-keywords;
		overflow: hidden;

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

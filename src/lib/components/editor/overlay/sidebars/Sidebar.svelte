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

<div class="editor-overlay sidebar sidebar-{uniqueName}">
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

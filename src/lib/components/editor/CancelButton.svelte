<script lang="ts">
	import { X } from "lucide-svelte";

	let { shouldShow, cancel }: { shouldShow: boolean; cancel: () => void } =
		$props();

	let isHovering = $state(false);

	function onPointerEnter() {
		isHovering = true;
	}
	function onPointerLeave() {
		isHovering = false;
	}

	function _cancel() {
		if (!isHovering) {
			return;
		}
		cancel();
		onPointerLeave();
	}
</script>

{#if shouldShow}
	<div
		class={{ alert: true, hovered: isHovering }}
		onpointerup={_cancel}
		onpointerdown={_cancel}
		onpointerenter={onPointerEnter}
		onpointerleave={onPointerLeave}
	>
		<X />
		<span style="pointer-events: none;">Cancel</span>
	</div>
{/if}

<style>
	.alert {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		padding: 5px 10px;
		border-radius: 100vmin;
		display: flex;
		align-items: center;
		gap: 5px;
		transition: background-color 0.3s;
		pointer-events: auto;

		&.hovered {
			background-color: var(--delete-color);
			color: var(--on-delete-color);
		}
	}
</style>

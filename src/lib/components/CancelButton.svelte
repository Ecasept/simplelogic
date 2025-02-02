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
	<div id="container">
		<!-- onpointerup prevents the global onpointerup listener that would usually place the element from triggering
	 so that the button can receive the onClick event, and clicks on the alert don't do anything.
	 onpointermove makes it so that the component does not move when the mouse is on top of the dialog-->
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
	</div>
{/if}

<style>
	#container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		display: flex;
		justify-content: center;
	}
	.alert {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		padding: 5px 10px;
		border-radius: 50vh;
		margin-top: 10px;
		display: flex;
		align-items: center;
		gap: 5px;
		transition: background-color 0.3s;

		&.hovered {
			background-color: var(--delete-color);
			color: var(--on-delete-color);
		}
	}
</style>

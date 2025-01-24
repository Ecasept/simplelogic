<script lang="ts">
	import Button from "./Button.svelte";

	let { shouldShow, cancel }: { shouldShow: boolean; cancel: () => void } =
		$props();

	function stopPropagation(e: PointerEvent) {
		e.stopPropagation();
	}
</script>

{#if shouldShow}
	<!-- onpointerup prevents the global onpointerup listener that would usually place the element from triggering
	 so that the button can receive the onClick event, and clicks on the alert don't do anything.
	 onpointermove makes it so that the component does not move when the mouse is on top of the dialog-->
	<div
		class="alert"
		onpointerup={stopPropagation}
		onpointermove={stopPropagation}
	>
		<span>Adding component</span>
		<Button onClick={() => cancel()} text="Cancel" margin="0px"></Button>
	</div>
{/if}

<style>
	.alert {
		position: absolute;
		background-color: var(--primary-container-color);
		color: var(--on-primary-container-color);
		padding: 5px 10px;
		left: 50%;
		transform: translateX(-50%);
		border-radius: 50vh;
		margin-top: 10px;
		border: var(--primary-container-border-color) 1px solid;

		span {
			margin-right: 5px;
			pointer-events: none;
		}
	}
</style>

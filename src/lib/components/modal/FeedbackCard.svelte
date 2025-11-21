<script lang="ts">
	import { circuitModalViewModel } from "$lib/util/actions.svelte";
	import type { FeedbackMessage } from "$lib/util/viewModels/circuitModalViewModel";
	import { Trash } from "lucide-svelte";

	type Props = {
		feedback: FeedbackMessage | null;
	};

	function closeFeedback() {
		circuitModalViewModel.closeFeedback();
	}

	let { feedback }: Props = $props();
</script>

{#if feedback !== null}
	<div class={feedback.type} id="error-msg">
		<span>{feedback.message}</span>
		<button id="close-btn" onclick={closeFeedback}>
			<Trash size="20" />
		</button>
	</div>
{/if}

<style lang="scss">
	#error-msg {
		margin: 8px 0 0 0;
		padding: 4px;
		padding-left: 12px; // extra left padding for the text
		font-weight: 500;
		text-align: center;
		border-radius: var(--default-border-radius);

		display: flex;
		justify-content: space-between;
		align-items: center;

		&.error {
			animation: shake 0.3s ease-in-out;
			background-color: var(--danger-color);
			border: 1px solid var(--on-danger-color);
			color: var(--on-danger-color);
		}

		&.success {
			background-color: var(--success-color);
			border: 1px solid var(--on-success-color);
			color: var(--on-success-color);
			animation: fadeIn 0.3s ease-in-out;
		}
	}

	#close-btn {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		position: relative;
		padding: 8px;
		border-radius: var(--default-border-radius);

		&:hover {
			// Make darker/lighter depending on theme
			background-color: var(--highlight-filter);
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>

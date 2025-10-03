<script lang="ts">
	import { X } from "lucide-svelte";
	import type { Snippet } from "svelte";

	type Props = {
		title: string;
		icon?: Snippet;
		onClose: () => void;
		children: Snippet;
	};

	let { title, icon, onClose, children }: Props = $props();

	// Handle background click to close modal
	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="background" onclick={handleBackgroundClick}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="modal-bg" role="dialog" aria-modal="true" tabindex="0">
		<div id="modal-header">
			<div id="title-container">
				{#if icon}
					<div class="icon-container">
						{@render icon()}
					</div>
				{/if}
				<h2>{title}</h2>
			</div>
			<button
				title="Close"
				aria-label="Close"
				class="close-button"
				onclick={onClose}
			>
				<X size="20" />
			</button>
		</div>

		<div class="modal-content">
			{@render children()}
		</div>
	</div>
</div>

<style lang="scss">
	@import "$lib/css/variables.scss";

	#modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		color: var(--on-surface-color);
		margin-bottom: 8px;

		.close-button {
			background-color: transparent;
			border: none;
			cursor: pointer;
			padding: 8px;
			border-radius: 50%;
			color: var(--on-surface-color);
			transition: all 0.2s ease;
			line-height: 0;

			&:hover {
				background-color: var(--surface-highlight-color);
				transform: scale(1.1);
			}

			&:active {
				transform: scale(0.95);
			}
		}
	}

	#title-container {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 24px;

		h2 {
			margin: 0;
			font-weight: 600;
			font-size: 1.5rem;
			color: var(--on-surface-color);
		}
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: linear-gradient(
			135deg,
			var(--primary-color),
			var(--primary-highlight-color)
		);
		border-radius: 10px;
		color: var(--on-primary-color);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
		flex: 1;
	}

	.background {
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: translateY(-20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-bg {
		// The modal will take up to 600px in width, but shrink on smaller screens.
		width: 600px;

		// Always keep a margin of 5vw around the modal.
		// Using max-height and dvh instead of margin
		// to avoid issues with mobile browsers.
		max-width: 90vw;
		max-height: calc(100dvh - 10vw);

		background-color: var(--surface-color);
		border-radius: 20px;
		padding: 32px;
		box-sizing: border-box; // Include padding in height calculations
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;

		border: 1px solid var(--surface-border-color);
		animation: slideIn 0.3s ease-out;

		/* Custom scrollbar */
		&::-webkit-scrollbar {
			width: 6px;
		}

		&::-webkit-scrollbar-track {
			background: var(--surface-color);
		}

		&::-webkit-scrollbar-thumb {
			background: var(--primary-disabled-color);
			border-radius: 3px;
		}

		&::-webkit-scrollbar-thumb:hover {
			background: var(--on-surface-color);
		}
	}

	/* Mobile responsiveness */
	@media (max-width: $mobile-breakpoint) {
		.modal-bg {
			padding: 24px;
		}

		#title-container {
			margin-bottom: 20px;
			h2 {
				font-size: 1.25rem;
			}
		}
	}

	/* Focus management for accessibility */
	.modal-bg:focus-within {
		outline: none;
	}
</style>

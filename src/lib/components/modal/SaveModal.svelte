<script lang="ts">
	import { page } from "$app/stores";
	import { circuitModalViewModel } from "$lib/util/actions";
	import type { FeedbackMessage } from "$lib/util/viewModels/circuitModalViewModel";
	import { LogIn } from "lucide-svelte";
	import Button from "../reusable/Button.svelte";
	import HrText from "../reusable/HRText.svelte";
	import SignInButton from "../reusable/SignInButton.svelte";
	import FeedbackCard from "./FeedbackCard.svelte";

	type Props = {
		message: FeedbackMessage | null;
	};

	let { message }: Props = $props();

	let enteredName = $state("");

	function saveCircuit() {
		circuitModalViewModel.saveCircuit(enteredName);
	}

	function copyCircuitToClipboard() {
		circuitModalViewModel.copyCircuitToClipboard();
	}

	const isLoggedIn = $derived($page.data.session !== null);
</script>

<div class="action-section">
	<Button
		text="Copy to clipboard"
		onClick={copyCircuitToClipboard}
		margin="0px"
		height="2.75em"
	/>
</div>

{#if !isLoggedIn}
	<HrText text="or" margin="15px 5px" />
	<div class="sign-in-prompt">
		<div class="prompt-icon">
			<LogIn size="24" />
		</div>
		<span>Sign in to save your circuit to your account</span>
		<div class="signin-buttons-container">
			<SignInButton provider="github" source="loadModal" />
			<SignInButton provider="google" source="loadModal" />
		</div>
	</div>
{:else}
	<HrText text="or save online" margin="10px 5px" />
	<div id="entry">
		<input
			id="name-input"
			placeholder="Enter a descriptive name for your circuit..."
			type="text"
			bind:value={enteredName}
			autocomplete="off"
			spellcheck="false"
		/>
		<Button
			text="Save online"
			onClick={saveCircuit}
			margin="0px"
			height="2.75em"
		/>
	</div>
{/if}

<FeedbackCard feedback={message} />

<style lang="scss">
	@import "$lib/css/variables.scss";

	.action-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	#entry {
		display: flex;
		gap: 12px;
		align-items: stretch;
	}

	#name-input {
		flex: 1;
		padding: 12px 16px;
		background-color: var(--primary-color);
		border: 2px solid var(--primary-border-color);
		color: var(--on-primary-color);
		border-radius: var(--default-border-radius);
		font-size: 1rem;
		transition: all 0.2s ease;

		&:focus {
			outline: none;
			// border-color: var(--selected-outline-color);
			box-shadow: 0 0 0 3px var(--primary-color);
		}
	}

	.sign-in-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16px;
		padding: 24px;
		background: linear-gradient(
			135deg,
			var(--primary-container-color),
			var(--primary-color)
		);
		border-radius: var(--default-border-radius);
		color: var(--on-primary-container-color);
		border: 1px solid var(--primary-container-border-color);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

		.prompt-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 48px;
			height: 48px;
			background-color: var(--highlight-filter);
			border-radius: 50%;
			margin-bottom: 8px;
		}

		span {
			font-weight: 500;
			font-size: 1rem;
		}
	}

	.signin-buttons-container {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
		width: 100%;
		max-width: 280px;
	}

	/* Mobile responsiveness */
	@media (max-width: $mobile-breakpoint) {
		.sign-in-prompt {
			padding: 20px;
		}

		#entry {
			flex-direction: column;
			gap: 12px;
		}
	}
</style>

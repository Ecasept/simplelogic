<script lang="ts">
	import { page } from "$app/stores";
	import { circuitModalViewModel } from "$lib/util/actions.svelte";
	import type { ListRequestData } from "$lib/util/api";
	import type { FeedbackMessage } from "$lib/util/viewModels/circuitModalViewModel";
	import { LogIn } from "lucide-svelte";
	import Button from "../reusable/Button.svelte";
	import Checkbox from "../reusable/Checkbox.svelte";
	import HrText from "../reusable/HRText.svelte";
	import SignInButton from "../reusable/SignInButton.svelte";
	import CircuitList from "./CircuitList.svelte";
	import FeedbackCard from "./FeedbackCard.svelte";
	import PaginationControls from "./PaginationControls.svelte";

	type Props = {
		loadMode: "select" | "list";
		listRequestData: ListRequestData | null;
		fixConnections: boolean | null;
		message: FeedbackMessage | null;
		onSelect: (id: number) => void;
	};

	let { loadMode, fixConnections, listRequestData, message, onSelect }: Props =
		$props();

	function pasteCircuitFromClipboard() {
		circuitModalViewModel.pasteCircuitFromClipboard();
	}

	function loadCircuitList() {
		circuitModalViewModel.loadCircuitList(1);
	}

	function toggleFixConnections(checked: boolean) {
		circuitModalViewModel.setFixConnections(checked);
	}

	const isLoggedIn = $derived($page.data.session !== null);
</script>

{#if loadMode === "select"}
	<div class="action-section">
		<Button
			text="Paste from clipboard"
			onClick={pasteCircuitFromClipboard}
			height="2.75em"
		/>
		<label class="fix-connections">
			<Checkbox
				onchange={toggleFixConnections}
				checked={fixConnections ?? false}
			/>
			<span>Fix wire endpoint positions</span>
		</label>
	</div>

	{#if !isLoggedIn}
		<HrText text="or" margin="15px 5px" />
		<div class="sign-in-prompt">
			<div class="prompt-icon">
				<LogIn size="24" />
			</div>
			<p>Sign in to choose a saved circuit</p>
			<div class="signin-buttons-container">
				<SignInButton provider="github" source="loadModal" />
				<SignInButton provider="google" source="loadModal" />
			</div>
		</div>
	{:else}
		<HrText text="or" margin="10px 5px" />
		<div class="action-section">
			<Button
				text="Load saved circuits"
				onClick={loadCircuitList}
				height="2.75em"
			/>
		</div>
	{/if}
{:else}
	<div class="circuit-list-container">
		<CircuitList listData={listRequestData} {onSelect} />
	</div>
	{#if listRequestData}
		{@const currentPage = listRequestData.pagination.page}
		{@const hasNextPage = listRequestData.pagination.hasNextPage}
		{@const hasPrevPage = currentPage > 1}
		<PaginationControls
			{currentPage}
			{hasNextPage}
			{hasPrevPage}
			onPageChange={(page) => circuitModalViewModel.loadCircuitList(page)}
		/>
	{/if}
{/if}

<FeedbackCard feedback={message} />

<style lang="scss">
	@import "$lib/css/variables.scss";

	.action-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.circuit-list-container {
		flex: 1;
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

		p {
			margin: 0;
			font-weight: 500;
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

	.fix-connections {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		color: var(--on-surface-variant-color);
		margin: 0px 5px;

		input {
			cursor: pointer;
		}
	}

	/* Mobile responsiveness */
	@media (max-width: $mobile-breakpoint) {
		.sign-in-prompt {
			padding: 20px;
		}
	}
</style>

<script lang="ts">
	import { page } from "$app/stores";
	import { circuitModalViewModel } from "$lib/util/actions.svelte";
	import type { ListRequestData } from "$lib/util/api";
	import { availablePresets, type Preset } from "$lib/util/global.svelte";
	import type { FeedbackMessage } from "$lib/util/viewModels/circuitModalViewModel";
	import { ArrowBigLeft, LogIn, Plus } from "lucide-svelte";
	import Button from "../reusable/Button.svelte";
	import Checkbox from "../reusable/Checkbox.svelte";
	import HrText from "../reusable/HRText.svelte";
	import SignInButton from "../reusable/SignInButton.svelte";
	import CircuitList from "./CircuitList.svelte";
	import FeedbackCard from "./FeedbackCard.svelte";
	import PaginationControls from "./PaginationControls.svelte";

	type Props = {
		loadMode: "select" | "list";
		isOnboarding: boolean;
		listRequestData: ListRequestData | null;
		fixConnections: boolean;
		message: FeedbackMessage | null;
		onSelect: (id: number) => void;
	};

	let {
		loadMode,
		isOnboarding,
		fixConnections,
		listRequestData,
		message,
		onSelect,
	}: Props = $props();

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

	let screen = $state(isOnboarding ? "presets" : "options"); // 'presets' | 'options'

	function gotoPresets() {
		screen = "presets";
	}
	function gotoOptions() {
		screen = "options";
	}

	function loadPreset(id: number | "empty") {
		circuitModalViewModel.loadPreset(id);
	}
</script>

{#snippet presetCard(p: Preset)}
	<button class="preset-card" onclick={() => loadPreset(p.id)}>
		<img
			src={p.img}
			alt={`Preview of ${p.name} preset circuit`}
			loading="lazy"
			width="160"
			height="90"
			class="preset-image"
		/>
		<span class="preset-name">{p.name}</span>
	</button>
{/snippet}

{#snippet emptyPresetCard()}
	<button
		class="preset-card"
		onclick={() => loadPreset("empty")}
		title="Start with an empty circuit"
		aria-label="New empty circuit"
	>
		<div class="preset-image empty-preset">
			<Plus size="48" />
		</div>
		<span class="preset-name">New Circuit</span>
	</button>
{/snippet}

{#snippet presetScreen()}
	<div class="preset-screen">
		<div class={["screen-header", { onboarding: isOnboarding }]}>
			<h2>Choose a starter circuit</h2>
			<p class="subtitle">Select a preset to get started quickly</p>
			{#if isOnboarding}
				<button class="nav-link" onclick={gotoOptions}>Other options</button>
			{:else}
				<button class="nav-link" onclick={gotoOptions}>
					<ArrowBigLeft size="16" style="vertical-align: middle;" />
					Back
				</button>
			{/if}
		</div>
		<div class="preset-grid">
			{#if isOnboarding}
				{@render emptyPresetCard()}
			{/if}

			{#each availablePresets as p}
				{@render presetCard(p)}
			{/each}
		</div>
	</div>
{/snippet}

{#snippet optionsScreen()}
	<div class="options-screen">
		<div class="top-nav">
			{#if isOnboarding}
				<button class="nav-link" onclick={gotoPresets}>
					<ArrowBigLeft size="16" style="vertical-align: middle;" />
					Back to presets
				</button>
			{/if}
		</div>
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
			<HrText text="or" margin="0px 5px" />
			<div class="sign-in-prompt">
				<div class="prompt-icon"><LogIn size="24" /></div>
				<p>Sign in to choose a saved circuit</p>
				<div class="signin-buttons-container">
					<SignInButton provider="github" source="loadModal" />
					<SignInButton provider="google" source="loadModal" />
				</div>
			</div>
		{:else}
			<HrText text="or" margin="0px 5px" />
			<div class="action-section">
				<Button
					text="Load saved circuits"
					onClick={loadCircuitList}
					height="2.75em"
				/>
			</div>
		{/if}
		{#if !isOnboarding}
			<HrText text="or" margin="0px 5px" />
			<div class="preset-section">
				<Button text="Load preset" onClick={gotoPresets} height="2.4em" />
			</div>
		{/if}
	</div>
{/snippet}

{#if loadMode === "select"}
	{#if screen === "presets"}
		{@render presetScreen()}
	{:else if screen === "options"}
		{@render optionsScreen()}
	{/if}
{:else}
	<!-- Existing list view -->
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

	.preset-screen {
		color: var(--on-surface-color);
	}
	.options-screen {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.screen-header {
		display: grid;
		grid-template-columns: 1fr auto;
		margin-bottom: 10px;
		column-gap: 10px;

		&.onboarding .nav-link {
			grid-column: 2;
			grid-row: 1 / span 2;
			max-height: 40px;
		}
		&:not(.onboarding) {
			grid-template-columns: auto 1fr;
			.nav-link {
				grid-column: 1;
				grid-row: 1 / span 2;
			}
		}
	}
	.screen-header h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	.nav-link {
		border: none;
		background: var(--primary-container-color);
		color: var(--on-primary-container-color);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.75px;
		cursor: pointer;
		padding: 6px 8px;
		border-radius: 6px;
		font-weight: 600;
	}
	.nav-link:hover {
		background: var(--primary-color);
		color: var(--on-primary-color);
	}
	.subtitle {
		margin: 0;
		font-size: 0.75rem;
		color: var(--on-surface-variant-color);
	}
	.preset-grid {
		display: grid;
		gap: 14px;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	}
	.preset-card {
		position: relative;
		padding: 14px 16px 16px 16px;
		background: var(--primary-container-color);
		// border: 1px dashed var(--primary-container-border-color);
		border: 2px solid transparent;
		border-radius: 14px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 6px;
		text-align: left;
		overflow: hidden;
		transition: border-color 0.25s ease;
	}

	.preset-image {
		border-radius: 8px;
		margin-bottom: 8px;
		width: 100%;
		object-fit: cover;

		&.empty-preset {
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--surface-variant-color);
			border: 2px dashed var(--on-surface-variant-color);
			color: var(--on-surface-variant-color);
			height: 90px;
		}
	}
	.preset-card::before {
		content: "";
		position: absolute;
		inset: 0;
		background: var(--highlight-filter);
		opacity: 0;
		transition: opacity 0.3s;
	}
	.preset-card:hover::before {
		opacity: 0.5;
	}
	.preset-card:hover {
		border-color: var(--primary-container-color);
	}
	.preset-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--on-surface-color);
		text-align: center;
	}
	.bottom-actions {
		display: flex;
		justify-content: flex-end;
	}
	.bottom-actions .secondary {
		background: none;
		border: 1px solid var(--outline-color);
		color: var(--primary-color);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.75px;
		padding: 6px 12px;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
	}
	.bottom-actions .secondary:hover {
		background: var(--highlight-filter);
	}

	/* Shared existing styles retained */
	.action-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.preset-section {
		display: flex;
		flex-direction: column;
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
		margin: 0 5px;
	}
	.fix-connections :global(input) {
		cursor: pointer;
	}
</style>

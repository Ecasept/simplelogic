<script lang="ts">
	import {
		authViewModel,
		type AuthUiState,
	} from "$lib/util/viewModels/authViewModel";
	import { CircleUserRound } from "lucide-svelte";
	import AuthentificationSection from "./AuthentificationSection.svelte";
	let { uiState }: { uiState: AuthUiState } = $props();
</script>

<div class="toolbar">
	<button
		class={["icon", { open: uiState.open }]}
		onclick={() => authViewModel.toggleOpen()}
	>
		<CircleUserRound size="24px" />
	</button>
	{#if uiState.open}
		<div class="auth-wrapper">
			<AuthentificationSection {uiState} />
		</div>
	{/if}
</div>

<style>
	.toolbar {
		background-color: var(--surface-color);
		color: var(--on-surface-color);
		margin: 10px;
		border-radius: 100%;
		padding: 0px;
		border: 1px solid var(--surface-border-color);
		box-shadow: 0px 0px 10px var(--shadow-color);
	}
	.icon {
		cursor: pointer;
		padding: 10px;
		border-radius: 100%;
		background-color: transparent;
		border: none;
		color: var(--on-surface-color);
		line-height: 0;
	}

	.icon:hover,
	.icon.open {
		background-color: var(--primary-highlight-color);
	}

	.auth-wrapper {
		position: relative;
	}
</style>

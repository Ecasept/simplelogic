<script lang="ts">
	import {
		authViewModel,
		type AuthUiState,
	} from "$lib/util/viewModels/authViewModel";
	import { CircleUserRound } from "lucide-svelte";
	import AuthenticationPopup from "./AuthenticationPopup.svelte";
	let { uiState }: { uiState: AuthUiState } = $props();
</script>

<div class="editor-overlay toolbar">
	<button
		class={["icon", { open: uiState.open }]}
		onclick={() => authViewModel.toggleOpen()}
		title="Open account menu"
		aria-label="Open account menu"
		aria-expanded={uiState.open}
		aria-haspopup="true"
		aria-controls="auth-popup"
	>
		<CircleUserRound size="24px" />
	</button>
</div>
{#if uiState.open}
	<AuthenticationPopup {uiState} />
{/if}

<style>
	.toolbar {
		border-radius: 100%;
		padding: 0px;
		justify-self: end;
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
</style>

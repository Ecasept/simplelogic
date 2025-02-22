<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { onEnter } from "$lib/util/keyboard";
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";
	import type { FormEventHandler } from "svelte/elements";

	let { uiState }: { uiState: SidebarUiState } = $props();
	function login() {
		sidebarViewModel.login();
	}
	function logout() {
		sidebarViewModel.logout();
	}
	const onInput: FormEventHandler<HTMLInputElement> = function (e) {
		sidebarViewModel.setPasswordInputValue(
			(e.target as HTMLInputElement | null)?.value ?? "",
		);
	};
</script>

<div class="authentification">
	<h2>Authentification</h2>
	{#if uiState.loggedIn}
		<div style="margin-bottom: 5px;">You are logged in</div>
		<Button text="Log out" margin="0px" onClick={logout} />
	{:else}
		<div>Enter server password to save and load graphs:</div>
		<div id="interactible">
			<input
				value={uiState.passwordInputValue}
				oninput={onInput}
				type="password"
				placeholder="Password"
				onkeypress={onEnter(() => login())}
			/>
			<Button text="Login" onClick={login} />
		</div>
	{/if}

	{#if uiState.message !== null}
		<span id="error-msg">{uiState.message}</span>
	{/if}
</div>

<style>
	.authentification {
		input {
			width: 100%;
			padding: 8px;
			height: 1em;

			color: var(--on-primary-color);
			background-color: var(--primary-color);
			border: 1px solid var(--primary-border-color);
			border-radius: 8px;
		}
	}
	#interactible {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	#error-msg {
		color: var(--error-color);
	}
</style>

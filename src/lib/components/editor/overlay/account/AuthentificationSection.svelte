<script lang="ts">
	import Button from "$lib/components/reusable/Button.svelte";
	import { onEnter } from "$lib/util/keyboard";
	import {
		authViewModel,
		type AuthUiState,
	} from "$lib/util/viewModels/authViewModel";
	import type { FormEventHandler } from "svelte/elements";
	import ThemeSwitcher from "./ThemeSwitcher.svelte";

	let { uiState }: { uiState: AuthUiState } = $props();
	function login() {
		authViewModel;
	}
	const onInput: FormEventHandler<HTMLInputElement> = function (e) {
		authViewModel.setPasswordInpuauthViewModel(
			(e.target as HTMLInputElement | null)?.value ?? "",
		);
	};
</script>

<div class="container">
	<h2>Authentification</h2>
	<ThemeSwitcher />
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
	.container {
		position: absolute;
		right: 0;
		top: 0;
		background-color: var(--surface-color);
		color: var(--on-surface-color);
		margin: 10px;
		border-radius: var(--default-border-radius);
		padding: 0px;
		border: 1px solid var(--surface-border-color);
		box-shadow: 0px 0px 10px var(--shadow-color);

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

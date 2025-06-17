<script lang="ts">
	import { page } from "$app/state";
	import Button from "$lib/components/reusable/Button.svelte";
	import SignInButton from "$lib/components/reusable/SignInButton.svelte";
	import { type AuthUiState } from "$lib/util/viewModels/authViewModel";
	import { signOut } from "@auth/sveltekit/client";
	import ThemeSwitcher from "./ThemeSwitcher.svelte";

	let { uiState }: { uiState: AuthUiState } = $props();
</script>

<div class="containing-block">
	<div class="editor-overlay popup-card" id="auth-popup" role="dialog">
		<span class="header">
			<h3>Account</h3>
			<ThemeSwitcher />
		</span>
		{#if page.data.session}
			{@const img = page.data.session.user?.image || ""}
			{@const name = page.data.session.user?.name || "unknown user"}
			{@const email = page.data.session.user?.email || "unknown email"}
			<div class="user-section">
				<span class="user-info">
					<img src={img} alt="User Avatar" />
					<span>{name}</span>
				</span>
				<Button
					text="Sign out"
					type="danger"
					onClick={() => signOut()}
					margin="0px"
				/>
			</div>
		{:else}
			<div class="login-prompt">Sign in to access all features</div>
			<div class="signin-buttons">
				<SignInButton provider="github" />
				<SignInButton provider="google" />
			</div>
		{/if}
	</div>
</div>

<style>
	.popup-card {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		min-width: 250px;
		position: absolute;
		right: 0;
		margin-top: 8px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		h3 {
			margin: 0;
			font-size: 1.2em;
			font-weight: 600;
		}
	}

	.user-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		img {
			border-radius: 50%;
			width: 36px;
			height: 36px;
		}
	}

	.login-prompt {
		text-align: center;
	}

	.signin-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px; /* Adjusted from 10px */
	}

	.containing-block {
		position: relative;
		grid-area: auth-popup;
		width: 100%;
		z-index: 2;
	}
</style>

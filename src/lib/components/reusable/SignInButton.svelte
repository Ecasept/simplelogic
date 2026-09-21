<script lang="ts">
	import { graphManager } from "$lib/util/editor/editor.svelte";
	import { getTheme } from "$lib/util/ui/theme.svelte";
	import {
		storeSignInSession,
		type SignInSource,
	} from "$lib/util/persistence/session";
	import { signIn } from "@auth/sveltekit/client";

	type Provider = "github" | "google";

	const { provider, source }: { provider: Provider; source: SignInSource } =
		$props();

	let error = $state<string | null>(null);
	async function _signIn(provider: Provider) {
		error = null;
		try {
			storeSignInSession(sessionStorage, graphManager.getGraphData(), source);
		} catch {
			error =
				"Could not preserve your circuit for sign-in. Allow browser storage and try again.";
			return;
		}
		try {
			await signIn(provider);
		} catch {
			error = "Unable to sign in. Please try again.";
		}
	}

	const icons = {
		google: {
			light: "/icons/google.webp",
			dark: "/icons/google.webp",
		},
		github: {
			light: "/icons/github-mark-white.svg",
			dark: "/icons/github-mark.svg",
		},
	};

	let theme = $derived(getTheme());

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

<button class="signin-btn" onclick={() => _signIn(provider)}>
	<img
		src={icons[provider][theme]}
		alt="{capitalize(provider)} icon"
		class="signin-icon"
		width="24"
		height="24"
	/>
	Continue with {capitalize(provider)}
</button>

{#if error}<p role="alert">{error}</p>{/if}

<style lang="scss">
	.signin-btn {
		border: none;
		border-radius: var(--default-border-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 8px 12px;
		cursor: pointer;

		:global(.theme-light) & {
			background-color: black;
			color: white;
		}
		:global(.theme-dark) & {
			background-color: white;
			color: black;
			// border: 1px solid white;
		}
	}

	.signin-btn:hover {
		background: #f3f3f3;
	}
</style>

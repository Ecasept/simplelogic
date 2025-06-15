<script lang="ts">
	import { graphManager } from "$lib/util/actions";
	import { getTheme } from "$lib/util/theme.svelte";
	import { signIn } from "@auth/sveltekit/client";

	type Provider = "github" | "google";

	const { provider }: { provider: Provider } = $props();

	function _signIn(provider: Provider) {
		// Temporarily save current circuit to session storage
		// to restore it after sign-in
		sessionStorage.setItem(
			"currentCircuit",
			JSON.stringify(graphManager.getGraphData()),
		);

		signIn(provider);
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

<style lang="scss">
	.signin-btn {
		border: none;
		border-radius: var(--default-border-radius);
		display: flex;
		align-items: center;
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

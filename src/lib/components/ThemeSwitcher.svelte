<script lang="ts">
	import { getTheme, setTheme } from "$lib/util/theme.svelte";
	import { Moon, SunDim, SunMoon } from "lucide-svelte";

	let theme = $derived.by(getTheme);
</script>

<span id="container">
	<button
		class={{ selected: theme === "light" }}
		onclick={() => setTheme("light")}
		title="Light theme"
		aria-label="Light theme"
	>
		<SunDim size="20px" />
	</button>
	<button
		class={{ selected: theme === "auto" }}
		onclick={() => setTheme("auto")}
		title="System"
		aria-label="System"
	>
		<SunMoon size="20px" />
	</button>
	<button
		class={{ selected: theme === "dark" }}
		onclick={() => setTheme("dark")}
		title="Dark theme"
		aria-label="Dark theme"
	>
		<Moon size="20px" />
	</button>
</span>

<style lang="scss">
	#container {
		display: inline-flex;
		background-color: var(--primary-container-color);
		border-radius: calc(50vh);
		padding: 2px;
		align-items: center;

		button {
			border: none;
			cursor: pointer;
			border-radius: 100%;
			background-color: transparent;
			display: grid;
			place-items: center;
			padding: 2px;
			color: var(--on-surface-color); // svg color

			transition: background-color 0.3s;
			&.selected {
				background-color: var(--primary-color);
			}
		}
	}

	/* ==== Theme switching ==== */
	@mixin theme-light {
		--surface-color: rgb(126, 190, 113);
		--primary-container-color: #a7daa4;
		--primary-color: #c1dfbf;
		--primary-highlight-color: #a1bf9f;
		--primary-disabled-color: gray;
		--on-surface-color: black;
		--on-primary-color: black;
		--on-primary-container-color: black;
		--error-color: red;
		--primary-border-color: black;
		--primary-container-border-color: var(--primary-border-color);

		--canvas-background-color: rgb(238, 255, 223);
		--component-outline-color: black;
		--component-background-color: green;
		--on-component-background-color: black;
		--delete-color: red;
		--on-delete-color: white;
		--component-delete-color: var(--delete-color);
		--handle-connect-color: purple;
	}
	@mixin theme-dark {
		--surface-color: #171d16;
		--primary-container-color: #2e3426;
		--primary-color: #304302;
		--primary-highlight-color: #48610e;
		--primary-disabled-color: #b2aba1;
		--on-surface-color: #b9de6f;
		--on-primary-color: #b9de6f;
		--on-primary-container-color: #b9de6f;
		--error-color: #ff6e6e;
		--primary-border-color: #738b43; // Darker version of on-primary-color
		--primary-container-border-color: var(--primary-border-color);

		--canvas-background-color: #2c2c2c;
		--component-outline-color: rgb(189, 196, 171);
		--component-background-color: #4f7000;
		--on-component-background-color: white;
		--delete-color: red;
		--on-delete-color: white;
		--component-delete-color: var(--delete-color);
		--handle-connect-color: rgb(184, 0, 184);
	}

	:global(:root:has(.theme-host.theme-light)) {
		@include theme-light;
	}

	:global(:root:has(.theme-host.theme-dark)) {
		@include theme-dark;
	}

	/* Default scheme */
	@media (prefers-color-scheme: dark) {
		:global(:root:not(:has(.theme-host.user-theme))) {
			@include theme-dark;
		}
	}

	@media not (prefers-color-scheme: dark) {
		:global(:root:not(:has(.theme-host.user-theme))) {
			@include theme-light;
		}
	}
</style>

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
		<SunDim size="24px" />
	</button>
	<button
		class={{ selected: theme === "auto" }}
		onclick={() => setTheme("auto")}
		title="System"
		aria-label="System"
	>
		<SunMoon size="24px" />
	</button>
	<button
		class={{ selected: theme === "dark" }}
		onclick={() => setTheme("dark")}
		title="Dark theme"
		aria-label="Dark theme"
	>
		<Moon size="24px" />
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
</style>

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
		background-color: var(--surface-color);
		box-shadow: 0px 0px 10px var(--shadow-color);
		border: 1px solid var(--surface-border-color);
		border-radius: var(--default-border-radius); //50vh;
		padding: 5px;
		align-items: center;

		button {
			border: none;
			cursor: pointer;
			border-radius: var(--default-border-radius);
			background-color: transparent;
			display: grid;
			place-items: center;
			padding: 5px;
			color: var(--on-surface-color); // svg color

			transition: background-color 0.3s;
			&.selected {
				background-color: var(--surface-highlight-color);
			}
		}
	}
</style>

<script lang="ts">
	import { debugLog } from "$lib/util/global.svelte";
	import { Check } from "lucide-svelte";

	let {
		onchange,
		checked,
	}: { onchange: (checked: boolean) => void; checked: boolean } = $props();

	$inspect(checked).with(debugLog("Checkbox checked"));
</script>

<label class={["wrapper", { checked: checked }]}>
	<input
		type="checkbox"
		{checked}
		onchange={(e) => onchange(e.currentTarget.checked)}
	/>
	<span class="icon">
		<Check size="16" />
	</span>
</label>

<style lang="scss">
	input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}
	.icon {
		transition: opacity 0.1s;
	}
	.wrapper {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		padding: 4px;
		border-radius: 8px;
		line-height: 0;
		border: 1px solid var(--primary-border-color);
		cursor: pointer;
		transition: background-color 0.1s;

		&:not(.checked) {
			background-color: var(--background-color);
			.icon {
				opacity: 0;
			}
		}
	}
</style>

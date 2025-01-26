<script lang="ts">
	import { EditorAction } from "$lib/util/actions";
	import { onEnter } from "$lib/util/keyboard";
	import type { ComponentType } from "$lib/util/types";

	type Props = {
		componentId: number;
		x: number;
		y: number;
		width: number;
		height: number;
		type: ComponentType;
		isPowered: boolean;
		editMode: string | null;
	};
	let { componentId, x, y, width, height, type, isPowered, editMode }: Props =
		$props();

	let middleX = $derived(x + width / 2);
	let middleY = $derived(y + height / 2);
</script>

{#if type === "IN"}
	<circle
		role="button"
		tabindex="0"
		class="input"
		cx={middleX}
		cy={middleY}
		r="10"
		style="pointer-events: {editMode === null || editMode === 'simulate'
			? 'all'
			: 'none'};"
		fill={isPowered ? "var(--component-delete-color)" : "black"}
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={() => {
			EditorAction.togglePower(componentId);
		}}
		onkeypress={onEnter(() => {
			EditorAction.togglePower(componentId);
		})}
	/>
{:else if type === "LED"}
	<circle
		class="led"
		cx={middleX}
		cy={middleY}
		r="10"
		style="pointer-events: none;"
		fill={isPowered ? "var(--component-delete-color)" : "black"}
	/>
{:else}
	<text
		x={x + width / 2}
		y={y + height / 2}
		font-size="12"
		dy=".35em"
		text-anchor="middle"
		fill="currentColor"
	>
		{type}
	</text>
{/if}

<style>
	text {
		pointer-events: none;
		color: var(--on-component-background-color);
	}
</style>

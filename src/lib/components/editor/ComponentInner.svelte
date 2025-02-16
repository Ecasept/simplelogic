<script lang="ts">
	import { EditorAction } from "$lib/util/actions";
	import { onEnter } from "$lib/util/keyboard";
	import type { ComponentType } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";
	import { P } from "ts-pattern";

	type Props = {
		componentId: number;
		x: number;
		y: number;
		width: number;
		height: number;
		type: ComponentType;
		isPowered: boolean;
		uiState: EditorUiState;
	};
	let { componentId, x, y, width, height, type, isPowered, uiState }: Props =
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
		style="pointer-events: {uiState.matches({
			mode: P.union('simulate', 'edit'),
		})
			? 'inherit'
			: 'none'};"
		fill={isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)"}
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={() => {
			if (
				uiState.matches({ editType: "idle" }) ||
				uiState.matches({ mode: "simulate" })
			) {
				EditorAction.togglePower(componentId);
			}
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
		fill={isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)"}
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

<script lang="ts">
	import { EditorAction } from "$lib/util/actions.svelte";
	import { onEnter } from "$lib/util/keyboard";
	import { RotationInfo } from "$lib/util/positioning";
	import type { ComponentType } from "$lib/util/types";
	import type { EditorUiState } from "$lib/util/viewModels/editorViewModel.svelte";

	type Props = {
		componentId: number;
		x: number;
		y: number;
		width: number;
		height: number;
		type: ComponentType;
		isPowered: boolean;
		customData?: Record<string, unknown>;
		rotationInfo: RotationInfo;
		uiState: EditorUiState;
	};
	let {
		componentId,
		x,
		y,
		width,
		height,
		type,
		isPowered,
		customData,
		rotationInfo,
		uiState,
	}: Props = $props();

	let middleX = $derived(x + width / 2);
	let middleY = $derived(y + height / 2);
	let showLabel = $derived(customData?.showLabel !== false);
	let ioLabel = $derived(
		type === "IN" || type === "LED" ? String(customData?.label ?? "") : "",
	);
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
			mode: 'simulate',
		})
			? 'inherit'
			: 'none'};"
		fill={isPowered
			? "var(--component-delete-color)"
			: "var(--component-outline-color)"}
		onclick={() => {
			// Allow toggling the input
			if (uiState.matches({ mode: "simulate", isPanning: false })) {
				EditorAction.togglePower(componentId);
			}
		}}
		onkeypress={onEnter(() => {
			EditorAction.togglePower(componentId);
		})}
		transform={rotationInfo.asRotate()}
	/>
	{#if showLabel && ioLabel !== ""}
		<text
			x={middleX}
			y={y + height + 14}
			font-size="12"
			dominant-baseline="middle"
			text-anchor="middle"
			fill="currentColor"
			class="io-name"
		>
			{ioLabel}
		</text>
	{/if}
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
		transform={rotationInfo.asRotate()}
	/>
	{#if showLabel && ioLabel !== ""}
		<text
			x={middleX}
			y={y + height + 14}
			font-size="12"
			dominant-baseline="middle"
			text-anchor="middle"
			fill="currentColor"
			class="io-name"
		>
			{ioLabel}
		</text>
	{/if}
{:else}
	<text
		x={middleX}
		y={middleY}
		font-size="12"
		dominant-baseline="middle"
		text-anchor="middle"
		fill="currentColor"
		transform={rotationInfo.asTranslateFor({ x: middleX, y: middleY })}
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

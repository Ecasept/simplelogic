<script lang="ts">
	import Canvas from "$lib/components/editor/Canvas.svelte";
	import OnCanvas from "$lib/components/editor/overlay/OnCanvas.svelte";
	import CircuitModal from "$lib/components/modal/CircuitModal.svelte";
	import {
		canvasViewModel,
		circuitModalViewModel,
		editorViewModel,
		graphManager,
		persistenceActions,
		interactionController,
		editorUiState,
	} from "$lib/util/editor.svelte";
	import { debugLog, setAvailablePresets } from "$lib/util/global.svelte";
	import { handleKeyDown } from "$lib/util/keyboard";
	import { normalizePointer } from "$lib/util/interaction.svelte";
	import { getThemeClass } from "$lib/util/theme.svelte";
	import { authViewModel } from "$lib/util/viewModels/authViewModel";
	import { onMount } from "svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
	let themeClass = $derived.by(getThemeClass);

	onMount(() => {
		// Check if there is a circuit in the session storage from a previous sign in
		const sessionCircuit = sessionStorage.getItem("currentCircuit");
		if (sessionCircuit) {
			// If there is, load it into the editor
			const circuit = JSON.parse(sessionCircuit);
			graphManager.setGraphData(circuit);
			graphManager.notifyAll();
			sessionStorage.removeItem("currentCircuit");
		}
		const source = sessionStorage.getItem("signInSource");
		if (source) {
			sessionStorage.removeItem("signInSource");
			switch (source) {
				case "saveModal":
					persistenceActions.saveGraph();
					break;
				case "loadModal":
					persistenceActions.loadGraphManually();
					break;
				case "authPopup":
					authViewModel.toggleOpen();
					break;
			}
		}

		const storedSettings = localStorage.getItem("editorSettings");
		if (storedSettings) {
			try {
				const settings = JSON.parse(storedSettings);
				editorViewModel.applySettings(settings);
			} catch (e) {
				console.error("Failed to parse stored settings:", e);
			}
		}

		// Determine if onboarding should be skipped
		const urlParams = new URL(window.location.href).searchParams;
		const skipOnboarding = urlParams.has("no-onboarding");
		setAvailablePresets(data.presets);

		if (!source && !sessionCircuit && !skipOnboarding) {
			// Fresh load, show the load modal (onboarding)
			persistenceActions.loadGraph(true);
		}
		return () => interactionController.cancel();
	});

	$inspect(editorUiState.current).with(debugLog("UISTATE"));
</script>

<svelte:window
	onpointermove={(e) => interactionController.pointerMove(normalizePointer(e))}
	onpointerup={(e) => interactionController.pointerUp(normalizePointer(e))}
	onpointercancel={(e) =>
		interactionController.pointerCancel(normalizePointer(e))}
	onlostpointercapture={(e) =>
		interactionController.pointerCancel(normalizePointer(e))}
	onblur={() => interactionController.cancel()}
	onkeydown={handleKeyDown}
/>

<div class="wrapper theme-host {themeClass}">
	<OnCanvas uiState={editorUiState.current} authUiState={$authViewModel}
	></OnCanvas>
	<Canvas uiState={$canvasViewModel}></Canvas>

	{#if $circuitModalViewModel.mode !== null}
		<CircuitModal uiState={$circuitModalViewModel}></CircuitModal>
	{/if}
</div>

<style>
</style>

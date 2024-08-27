<script lang="ts">
	import {
		EditorAction,
		editorViewModel,
		PersistenceAction,
	} from "$lib/util/actions";
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";
	import type { FormEventHandler } from "svelte/elements";

	export let uiState: SidebarUiState;
	export let loggedIn;
	$: sidebarViewModel.setLoggedInState(loggedIn);

	function addComponent(label: string, type: string, e: MouseEvent) {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		EditorAction.addComponent(label, type, e);
	}

	function handleUndo() {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		EditorAction.undo();
	}

	function saveGraph() {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		PersistenceAction.saveGraph();
	}
	function loadGraph() {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		PersistenceAction.loadGraph();
	}
	function toggleOpen() {
		if (editorViewModel.uiState.isModalOpen) {
			return;
		}
		sidebarViewModel.toggleOpen();
	}
	function login() {
		sidebarViewModel.login();
	}
	function logout() {
		sidebarViewModel.logout();
	}
	function onKeyPress(e: KeyboardEvent) {
		if (e.key === "Enter") {
			login();
		}
	}
	const onInput: FormEventHandler<HTMLInputElement> = function (e) {
		sidebarViewModel.setPasswordInputValue(
			e.target !== null && (e.target as HTMLInputElement).value !== null
				? (e.target as HTMLInputElement).value
				: "",
		);
	};
</script>

<div class="sidebarWrapper" class:open={uiState.open}>
	<button class="collapse" on:click={toggleOpen}><span>▶</span></button>
	<div class="content">
		<div class="actions">
			<button on:click={(e) => addComponent("test", "AND", e)}>Add AND</button>
			<button on:click={(e) => addComponent("test2", "OR", e)}>Add OR</button>
			<button on:click={saveGraph}>Save</button>
			<button on:click={loadGraph}>Load</button>
			<button on:click={handleUndo}>Undo</button>
		</div>
		<div class="authentification">
			Authentification
			<br />
			{#if uiState.loggedIn}
				<input
					value={uiState.passwordInputValue}
					disabled={true}
					type="password"
				/>
				<button on:click={logout}>Log out</button>
			{:else}
				<input
					value={uiState.passwordInputValue}
					on:input={onInput}
					type="password"
					on:keypress={onKeyPress}
				/>
				<button on:click={login}>Login</button>
			{/if}
			{#if uiState.message !== null}
				<br />
				{uiState.message}
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.sidebarWrapper {
		color: white;
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: rgb(51, 51, 51);
		transition: left 0.3s ease-in-out;
		left: 80vw;
		display: flex;

		&:not(.open) {
			left: 99vw;

			.collapse > span {
				transform: rotate(180deg);
			}
		}

		.collapse {
			bottom: 0;
			height: 100%;
			width: 1vw;
			padding: 0;
			border: unset;
			background: rgba(255, 255, 255, 0.1);
			cursor: pointer;

			span {
				color: white;
				display: block;
				transition: transform 0.3s;
			}
		}
		.content {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			padding: 10px;
		}
	}
</style>

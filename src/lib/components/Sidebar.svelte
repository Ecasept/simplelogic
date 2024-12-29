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
	import { Save, Download, Undo } from "lucide-svelte";

	export let uiState: SidebarUiState;
	export let editType: string | null;
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
		<h2>Tools</h2>

		<div class="addactions">
			{#each ["AND", "OR", "NOT", "XOR", ["INPUT", "IN"], "LED", ["DUPLICATE", "DBL"]] as type}
				{@const t = Array.isArray(type) ? type[0] : type}
				{@const name = Array.isArray(type) ? type[1] : type}
				<button class="addbtn" on:click={(e) => addComponent("none", t, e)}>
					{name}
				</button>
			{/each}
		</div>

		<hr />

		<div class="actions">
			<button class="actionbtn icon" on:click={saveGraph}
				><Save></Save>Save</button
			>
			<button class="actionbtn icon" on:click={loadGraph}
				><Download></Download>Load</button
			>
			<button class="actionbtn icon" on:click={handleUndo}
				><Undo></Undo>Undo</button
			>
		</div>

		<hr />

		<div>
			<div class="editingmode">
				Editing Mode:
				{#if editType === "add"}
					Add
				{:else if editType === "move"}
					Move
				{:else if editType === "delete"}
					Delete
				{:else}
					Normal
				{/if}
			</div>
			<button class="actionbtn" on:click={EditorAction.toggleDelete}
				>Toggle Delete</button
			>
		</div>
		<div id="space"></div>
		<div class="authentification">
			<h2>Authentification</h2>
			{#if uiState.loggedIn}
				<button style="margin-left: 0px;" class="actionbtn" on:click={logout}
					>Log out</button
				>
			{:else}
				<div>Enter server password to save and load graphs:</div>
				<input
					value={uiState.passwordInputValue}
					on:input={onInput}
					type="password"
					placeholder="Password"
					on:keypress={onKeyPress}
				/>
				<button class="actionbtn" on:click={login}>Login</button>
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
		color: black;
		position: absolute;
		width: 20vw;
		height: 100vh;
		right: 0;
		top: 0;
		background-color: var(--bg-color);
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
			background-color: rgb(81, 124, 72);
			cursor: pointer;

			span {
				color: black;
				display: block;
				transition: transform 0.3s;
			}
		}
		.content {
			display: flex;
			flex-direction: column;
			padding: 10px;
			width: 100%;
		}
		#space {
			flex-grow: 1;
		}

		.addactions {
			display: flex;
			flex-wrap: wrap;
			justify-content: space-around;
			justify-content: flex-start;
		}

		.addbtn {
			background-color: var(--light-color);
			color: black;
			border: 1px solid black;
			cursor: pointer;
			height: 50px;
			width: 50px;
			border-radius: 16px;
			margin: 5px;

			&:hover {
				background-color: var(--light-darker-color);
			}
		}

		hr {
			border: 1px solid black;
			margin: 20px 0;
		}

		.actions {
			display: flex;
			justify-content: space-around;
			flex-wrap: wrap;
		}

		.actionbtn {
			background-color: var(--light-color);
			color: black;
			border: 1px solid black;
			cursor: pointer;
			border-radius: 12px;
			margin: 5px;
			padding: 8px;

			&:hover {
				background-color: var(--light-darker-color);
			}

			&.icon {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 5px;
			}
		}

		.editingmode {
			margin: 10px;
		}

		.authentification {
			// margin: 10px;

			input {
				box-sizing: border-box;
				width: 60%;
				padding: 8px;

				background-color: var(--light-color);
				border: 1px solid black;
				border-radius: 8px;
			}
		}
	}
</style>

<script lang="ts">
	import { EditorAction, PersistenceAction } from "$lib/util/actions";
	import { COMPONENT_IO_MAPPING } from "$lib/util/global";
	import { onEnter } from "$lib/util/keyboard";
	import {
		sidebarViewModel,
		type SidebarUiState,
	} from "$lib/util/viewModels/sidebarViewModel";
	import { Download, Play, Save, Trash2, Undo } from "lucide-svelte";
	import type { FormEventHandler } from "svelte/elements";

	type Props = {
		uiState: SidebarUiState;
		editType: string | null;
		cookieLoggedIn: boolean;
	};
	let { uiState, editType, cookieLoggedIn }: Props = $props();

	sidebarViewModel.setLoggedInState(cookieLoggedIn);

	let simulating = $derived(editType === "simulate");

	function addComponent(type: string, e: MouseEvent) {
		EditorAction.addComponent(type, e);
	}

	function handleUndo() {
		EditorAction.undo();
	}

	function saveGraph() {
		PersistenceAction.saveGraph();
	}
	function loadGraph() {
		PersistenceAction.loadGraph();
	}
	function toggleOpen() {
		sidebarViewModel.toggleOpen();
	}
	function login() {
		sidebarViewModel.login();
	}
	function logout() {
		sidebarViewModel.logout();
	}

	const onInput: FormEventHandler<HTMLInputElement> = function (e) {
		sidebarViewModel.setPasswordInputValue(
			(e.target as HTMLInputElement | null)?.value ?? "",
		);
	};
</script>

<div class="sidebarWrapper" class:open={uiState.open}>
	<button class="collapse" onclick={toggleOpen}><span>▶</span></button>
	<div class="content">
		<h2>Tools</h2>

		<div class="addactions">
			{#each ["AND", "OR", "NOT", "XOR", ["INPUT", "IN"], "LED", ["DUPLICATE", "DBL"]] as type}
				{@const t = Array.isArray(type) ? type[0] : type}
				{@const name = Array.isArray(type) ? type[1] : type}
				<button
					disabled={simulating}
					title={COMPONENT_IO_MAPPING[t].description}
					class="addbtn"
					onclick={(e) => addComponent(t, e)}
				>
					{name}
				</button>
			{/each}
		</div>

		<hr />

		<div class="actions">
			<button disabled={simulating} class="actionbtn icon" onclick={saveGraph}
				><Save></Save>Save</button
			>
			<button disabled={simulating} class="actionbtn icon" onclick={loadGraph}
				><Download></Download>Load</button
			>
			<button disabled={simulating} class="actionbtn icon" onclick={handleUndo}
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
				{:else if editType === "simulate"}
					Simulate
				{:else}
					Normal
				{/if}
			</div>
			<button class="actionbtn icon" onclick={EditorAction.toggleDelete}
				><Trash2></Trash2>Toggle Delete</button
			>
			<button class="actionbtn icon" onclick={EditorAction.toggleSimulate}
				><Play></Play>Toggle Simulate</button
			>
		</div>

		<div id="space"></div>
		<div class="authentification">
			<h2>Authentification</h2>
			{#if uiState.loggedIn}
				<button style="margin-left: 0px;" class="actionbtn" onclick={logout}
					>Log out</button
				>
			{:else}
				<div>Enter server password to save and load graphs:</div>
				<input
					value={uiState.passwordInputValue}
					oninput={onInput}
					type="password"
					placeholder="Password"
					onkeypress={onEnter(() => login())}
				/>
				<button class="actionbtn" onclick={login}>Login</button>
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

		.addbtn:disabled,
		.actionbtn:disabled {
			background-color: var(--light-color);
			color: gray;
			border: 1px solid gray;
			cursor: default;
		}
	}
</style>

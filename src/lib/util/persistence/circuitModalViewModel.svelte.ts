import { graphManager } from "../graph/graph.svelte";
import { API, type ListRequestData } from "./api";
import { calculateHandlePosition } from "../shared/global.svelte";
import type { ComponentData, GraphData } from "../shared/types";
import { decodeDocument } from "./document";
import { cancellationDelay } from "../shared/cancellation";

export type FeedbackMessage = { type: "error" | "success"; message: string };
export type ModalActionState =
	| { status: "idle" }
	| { status: "pending" }
	| { status: "error"; message: string }
	| { status: "success"; message: string };
export type CircuitListState =
	| { status: "empty" }
	| { status: "loading"; previous: ListRequestData | null }
	| { status: "ready"; data: ListRequestData }
	| { status: "error"; message: string; previous: ListRequestData | null };
export type LoadScreen =
	| { type: "options" }
	| { type: "presets" }
	| { type: "circuit-list"; request: CircuitListState };
export type CircuitModalUiState =
	| { mode: "closed"; openingId: number }
	| { mode: "save"; openingId: number; action: ModalActionState }
	| {
			mode: "load";
			openingId: number;
			action: ModalActionState;
			screen: LoadScreen;
			fixConnections: boolean;
			isOnboarding: boolean;
	  };
export type LoadResult = { graph: GraphData; origin: "preset" | "custom" };
type LoadHandler = (
	result: LoadResult,
	signal: AbortSignal,
) => Promise<boolean>;
type LoadOptions = {
	onLoad: LoadHandler;
	fixConnections: boolean;
	isOnboarding: boolean;
};
const closedState = (): CircuitModalUiState => ({
	mode: "closed",
	openingId: 0,
});

const idleAction = (): ModalActionState => ({ status: "idle" });

export function feedbackFor(
	state: CircuitModalUiState,
): FeedbackMessage | null {
	if (state.mode === "closed") return null;
	if (state.action.status === "error" || state.action.status === "success")
		return { type: state.action.status, message: state.action.message };
	if (
		state.mode === "load" &&
		state.screen.type === "circuit-list" &&
		state.screen.request.status === "error"
	)
		return { type: "error", message: state.screen.request.message };
	return null;
}

function listData(request: CircuitListState): ListRequestData | null {
	if (request.status === "ready") return request.data;
	if (request.status === "loading" || request.status === "error")
		return request.previous;
	return null;
}

export class CircuitModalViewModel {
	public uiState = $state<CircuitModalUiState>(closedState());
	private lifetime = new AbortController();
	private requests = new Map<"action" | "list", AbortController>();
	private onLoad: LoadHandler | null = null;

	protected resetUiState() {
		this.lifetime.abort();
		this.lifetime = new AbortController();
		this.requests.clear();
		this.onLoad = null;
		this.uiState = {
			...closedState(),
			openingId: this.uiState.openingId + 1,
		};
	}

	openLoad({
		onLoad,
		isOnboarding = false,
	}: {
		onLoad: LoadHandler;
		isOnboarding?: boolean;
	}) {
		this.resetUiState();
		this.onLoad = onLoad;
		this.uiState = {
			mode: "load",
			openingId: this.uiState.openingId,
			action: idleAction(),
			screen: { type: isOnboarding ? "presets" : "options" },
			fixConnections: false,
			isOnboarding,
		};
	}

	openSave() {
		this.resetUiState();
		this.uiState = {
			mode: "save",
			openingId: this.uiState.openingId,
			action: idleAction(),
		};
	}

	close() {
		this.resetUiState();
	}

	/** A newer request cancels its predecessor; closing cancels every request. */
	private async runAction(work: (signal: AbortSignal) => Promise<void>) {
		if (this.uiState.mode === "closed") return;
		this.requests.get("action")?.abort();
		const request = new AbortController();
		this.requests.set("action", request);
		const signal = AbortSignal.any([this.lifetime.signal, request.signal]);
		this.uiState = { ...this.uiState, action: { status: "pending" } };
		try {
			if (!signal.aborted) await work(signal);
		} catch (error) {
			if (!signal.aborted)
				this.setError(
					error instanceof Error ? error.message : "Unable to complete request",
				);
		} finally {
			if (!signal.aborted) {
				this.requests.delete("action");
				if (
					"action" in this.uiState &&
					this.uiState.action.status === "pending"
				) {
					this.uiState = { ...this.uiState, action: idleAction() };
				}
			}
		}
	}

	showOptions() {
		if (this.uiState.mode !== "load") return;
		this.uiState = { ...this.uiState, screen: { type: "options" } };
	}

	showPresets() {
		if (this.uiState.mode !== "load") return;
		this.uiState = { ...this.uiState, screen: { type: "presets" } };
	}

	setFixConnections(value: boolean) {
		if (this.uiState.mode !== "load") return;
		this.uiState = { ...this.uiState, fixConnections: value };
	}

	private loadOptions(): LoadOptions | null {
		if (this.uiState.mode !== "load" || !this.onLoad) return null;
		return {
			onLoad: this.onLoad,
			fixConnections: this.uiState.fixConnections,
			isOnboarding: this.uiState.isOnboarding,
		};
	}

	/** Validate before geometry repair or editor mutation, including clipboard and presets. */
	private async completeLoad(
		input: unknown,
		origin: LoadResult["origin"],
		signal: AbortSignal,
		options: LoadOptions,
		message: string,
	) {
		if (signal.aborted) return;
		let graph: GraphData;
		try {
			graph = decodeDocument(input);
			if (options.fixConnections && origin === "custom") {
				graph = decodeDocument(this.fixGraphConnections(graph));
			}
		} catch {
			throw new Error("Invalid data: unable to load this circuit");
		}
		const loaded = await options.onLoad({ graph, origin }, signal);
		if (signal.aborted || !loaded) return;
		if (options.isOnboarding && origin === "preset") this.close();
		else this.setSuccess(message);
	}

	async pasteCircuitFromClipboard() {
		const options = this.loadOptions();
		if (!options) return;
		await this.runAction(async (signal) => {
			const input = await navigator.clipboard.readText();
			await this.completeLoad(
				input,
				"custom",
				signal,
				options,
				"Circuit pasted from clipboard",
			);
		});
	}

	async loadCircuit(id: number) {
		const options = this.loadOptions();
		if (!options) return;
		await this.runAction(async (signal) => {
			const result = await API.loadCircuit(id, signal);
			if (signal.aborted) return;
			if (!result.success) throw new Error(result.error);
			await this.completeLoad(
				result.data,
				"custom",
				signal,
				options,
				"Circuit loaded successfully",
			);
		});
	}

	async loadPreset(id: number | "empty") {
		const options = this.loadOptions();
		if (!options) return;
		await this.runAction(async (signal) => {
			let input: unknown = { components: {}, wires: {}, nextId: 0 };
			if (id !== "empty") {
				const result = await API.getPresetById(id, signal);
				if (signal.aborted) return;
				if (!result.success) throw new Error(result.error);
				input = result.data.data;
			}
			await this.completeLoad(
				input,
				"preset",
				signal,
				options,
				"Preset loaded",
			);
		});
	}

	async copyCircuitToClipboard() {
		if (
			this.uiState.mode !== "save" ||
			this.uiState.action.status === "pending"
		)
			return;
		await this.runAction(async (signal) => {
			const graph = decodeDocument(graphManager.getGraphData());
			await navigator.clipboard.writeText(JSON.stringify(graph));
			if (!signal.aborted) this.setSuccess("Circuit copied to clipboard");
		});
	}

	async saveCircuit(name: string) {
		if (
			this.uiState.mode !== "save" ||
			this.uiState.action.status === "pending"
		)
			return;
		await this.runAction(async (signal) => {
			const graph = decodeDocument(graphManager.getGraphData());
			if (
				!Object.keys(graph.components).length &&
				!Object.keys(graph.wires).length
			)
				throw new Error("No data to save - please create a circuit");
			name = name.trim();
			if (!name) throw new Error("Please enter a name");
			if (name.length > 200)
				throw new Error("Name must be at most 200 characters");
			const result = await API.saveCircuit(name, graph, signal);
			if (signal.aborted) return;
			if (!result.success) throw new Error(result.error);
			this.setSuccess("Circuit saved successfully");
		});
	}

	async loadCircuitList(page: number) {
		if (this.uiState.mode !== "load") return;
		this.requests.get("list")?.abort();
		const request = new AbortController();
		this.requests.set("list", request);
		const signal = AbortSignal.any([this.lifetime.signal, request.signal]);
		const previous =
			this.uiState.screen.type === "circuit-list"
				? listData(this.uiState.screen.request)
				: null;
		this.uiState = {
			...this.uiState,
			action:
				this.uiState.action.status === "pending"
					? this.uiState.action
					: idleAction(),
			screen: {
				type: "circuit-list",
				request: { status: "loading", previous },
			},
		};
		try {
			const result = await API.loadCircuitList(page, signal);
			if (signal.aborted) return;
			if (!result.success) throw new Error(result.error);
			if (this.uiState.mode !== "load") return;
			this.uiState = {
				...this.uiState,
				screen: {
					type: "circuit-list",
					request: { status: "ready", data: result.data },
				},
			};
		} catch (error) {
			if (signal.aborted || this.uiState.mode !== "load") return;
			this.uiState = {
				...this.uiState,
				screen: {
					type: "circuit-list",
					request: {
						status: "error",
						message:
							error instanceof Error
								? error.message
								: "Unable to load circuits",
						previous,
					},
				},
			};
			void this.scrollToFeedback();
		} finally {
			if (!signal.aborted) this.requests.delete("list");
		}
	}

	async deleteCircuit(id: number, goToPrevPage: boolean) {
		if (
			this.uiState.mode !== "load" ||
			this.uiState.action.status === "pending"
		)
			return;
		const currentData =
			this.uiState.screen.type === "circuit-list"
				? listData(this.uiState.screen.request)
				: null;
		const page = currentData?.pagination.page ?? 1;
		// A delete completion must not navigate back after the user changes pages.
		const listRequest = this.requests.get("list");
		const screen = this.uiState.screen;
		await this.runAction(async (signal) => {
			const result = await API.deleteCircuit(id, signal);
			if (signal.aborted) return;
			if (!result.success) throw new Error(result.error);
			if (
				this.requests.get("list") === listRequest &&
				this.uiState.mode === "load" &&
				this.uiState.screen === screen
			) {
				await this.loadCircuitList(Math.max(1, page - (goToPrevPage ? 1 : 0)));
			}
			if (
				!signal.aborted &&
				this.uiState.mode === "load" &&
				(this.uiState.screen.type !== "circuit-list" ||
					this.uiState.screen.request.status !== "error")
			)
				this.setSuccess("Circuit deleted successfully");
		});
	}

	private async scrollToFeedback() {
		const signal = this.lifetime.signal;
		await cancellationDelay(0, signal);
		if (!signal.aborted && feedbackFor(this.uiState))
			document
				.getElementById("error-msg")
				?.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	setError(message: string) {
		if (this.uiState.mode === "closed") return;
		this.uiState = { ...this.uiState, action: { status: "error", message } };
		void this.scrollToFeedback();
	}

	setSuccess(message: string) {
		if (this.uiState.mode === "closed") return;
		this.uiState = {
			...this.uiState,
			action: { status: "success", message },
		};
		void this.scrollToFeedback();
	}

	closeFeedback() {
		if (this.uiState.mode === "closed") return;
		if (
			this.uiState.action.status === "error" ||
			this.uiState.action.status === "success"
		) {
			this.uiState = { ...this.uiState, action: idleAction() };
		} else if (
			this.uiState.mode === "load" &&
			this.uiState.screen.type === "circuit-list" &&
			this.uiState.screen.request.status === "error"
		) {
			const previous = this.uiState.screen.request.previous;
			this.uiState = {
				...this.uiState,
				screen: {
					type: "circuit-list",
					request: previous
						? { status: "ready", data: previous }
						: { status: "empty" },
				},
			};
		}
	}
	private computeComponentHandlePos(comp: ComponentData, handleId: string) {
		const handle = comp.handles[handleId];
		return calculateHandlePosition(
			handle.edge,
			handle.pos,
			comp.size,
			comp.position,
			comp.rotation,
			true,
		);
	}

	private fixGraphConnections(graphData: GraphData): GraphData {
		// Creates a deep copy and normalizes every wire endpoint coordinate:
		// 1. Wire input -> the position of any connected output
		// 2. Wire output -> the position of a connected component input (if any)
		const data = structuredClone(graphData);
		for (const wireId in data.wires) {
			const wire = data.wires[wireId];

			// ---- INPUT END FIX ----
			const inputHandle = wire.handles.input;
			if (inputHandle.connections.length > 0) {
				const conn = inputHandle.connections[0]; // there should be only one connection
				if (conn.type === "wire") {
					// Snap to other wire handle coordinate
					const other = data.wires[conn.id];
					if (other) {
						inputHandle.x = other.handles[conn.handleId].x;
						inputHandle.y = other.handles[conn.handleId].y;
					}
				} else if (conn.type === "component") {
					// Snap to computed component handle position
					const comp = data.components[conn.id];
					if (comp) {
						const pos = this.computeComponentHandlePos(comp, conn.handleId);
						inputHandle.x = pos.x;
						inputHandle.y = pos.y;
					}
				}
			}

			// ---- OUTPUT END FIX ----
			const outputHandle = wire.handles.output;
			const compConn = outputHandle.connections.find(
				(c) => c.type === "component",
			);
			if (compConn) {
				// If the wire drives a component input, snap its output endpoint there
				const comp = data.components[compConn.id];
				if (comp) {
					const pos = this.computeComponentHandlePos(comp, compConn.handleId);
					outputHandle.x = pos.x;
					outputHandle.y = pos.y;
				}
			}
		}
		return data;
	}
}

export const circuitModalViewModel = new CircuitModalViewModel();

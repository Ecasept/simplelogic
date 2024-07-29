import type { Command, GraphData } from "$lib/util/types";
import { writable } from "svelte/store";

export const graph_store = writable<GraphData>({
	wires: [],
	components: [],
	nextId: 0,
});
export const history_store = writable<Command[]>([]);

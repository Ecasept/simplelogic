import type { Command, GraphData } from "$lib/util/types";
import { writable } from "svelte/store";

const graphArr: GraphData = { wires: [], components: [], nextId: 0 };
const historyArr: Command[] = [];

export const graph_store = writable<GraphData>(graphArr);
export const history_store = writable<Command[]>(historyArr);

export const graph = writable<GraphData>(graphArr);

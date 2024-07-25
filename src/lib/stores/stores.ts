import type { ComponentData, GraphData, WireData } from '$lib/util/types';
import { writable } from "svelte/store";

const emptyComponent = {
  id: 0,
  label: "",
  type: "",
  size: { x: 200, y: 200 },
  position: { x: 0, y: 0 },
  inputs: [] as number[],
  outputs: [] as number[],
};
const graphArr: GraphData = {wires: [], components: [], nextId: 0};

export const graph = writable<GraphData>(graphArr);

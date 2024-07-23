import type { graphItem } from "$lib/util/types";
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
const graphArr: any[] = [];

export const graph = writable<graphItem[]>(graphArr);

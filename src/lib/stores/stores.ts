import { writable } from 'svelte/store';

const emptyComponent = {
	id: 0,
	label: "",
	size: {x: 200, y: 200},
	position: {x: 0, y: 0},
	input: [] as number[],
	output: [] as number[]
}
const graphArr: any[] = []

export const graph = writable(graphArr);
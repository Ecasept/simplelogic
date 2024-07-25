export const GRID_SIZE = 50;

export function gridSnap(val: number) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export type Handle = { type: string };

// list of handles for each position
export type ComponentIOList = {
  [key in "top" | "bottom" | "left" | "right"]?: Handle[];
};

// list of x/y coordinates and id of objects that a wire connects to
// export type WireIOList = { x: number; y: number; id: number }[];

export type WireIO = { x: number; y: number; id: number };

// ==== Function Types ====

export type UpdatePositionFunction = (
  x: number,
  mouseStartOffsetX: number,
  y: number,
  mouseStartOffsetY: number
) => void;

// ==== Graph Types ====

export interface WireData {
  id: number;
  label: string;
  input: WireIO;
  output: WireIO;
}

export interface ComponentData {
  id: number;
  label: string;
  type: string;
  size: { x: number; y: number };
  position: { x: number; y: number };
  inputs: ComponentIOList;
  outputs: ComponentIOList;
}

export interface GraphData {
  wires: { [id in number]: WireData };
  components: { [id in number]: ComponentData };
  nextId: number;
}

// ==== Events ====
export interface HandleDownEvent {
  type: string; // "input" | "output"
  pos: string; // "top" | "bottom" | "left" | "right"
  handleIndex: number;
  handleX: number;
  handleY: number;
  id: number;
}

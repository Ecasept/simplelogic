export type Handle = { type: string };

// list of handles for each position
export type ComponentIOList = {
  [key in "top" | "bottom" | "left" | "right"]?: Handle[];
};

// list of x/y coordinates and id of objects that a wire connects to
export type WireIOList = { x: number; y: number; id: number }[];

export interface HandleDownEvent {
  pos: string;
  handleIndex: number;
  handleX: number;
  handleY: number;
  id: number;
}

export interface ComponentDownEvent {
  id: number;
  component: any;
  mouseOffset: { x: number; y: number };
  updatePosition: (
    x: number,
    mouseStartOffsetX: number,
    y: number,
    mouseStartOffsetY: number
  ) => void;
}

export interface WireData {
  id: number;
  label: string;
  inputs: WireIOList;
  outputs: WireIOList;
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
  wires: WireData[];
  components: ComponentData[];
  nextId: number;
}

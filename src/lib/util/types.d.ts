export type Handle = { type: string };

// list of handles for each position
export type ComponentIOList = {
  [key in "top" | "bottom" | "left" | "right"]?: Handle[];
};

// list of x/y coordinates and id of objects that a wire connects to
export type WireIOList = { x: number; y: number; id: number }[];

export interface HandleDownEvent {
  pos: Position;
  handleIndex: number;
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

export interface GraphItem {
  id: number;
  label: string;
  type: string;
  size: { x: number; y: number };
  position: { x: number; y: number };
  inputs: ComponentIOList | WireIOList;
  outputs: ComponentIOList | WireIOList;
  points: { x: number; y: number }[];
}

export interface Point {
  x: number;
  y: number;
  key: string;
}
  
export interface Segment {
  start: Point;
  end: Point;
}

export interface Matching {
  pointMap: Map<string, Point>;  
  segments: Segment[];
  freePoint: Point | null;
}

export interface KonvaCanvasRef {
  getPoints: () => { x: number; y: number }[];
  getLines: () => { start: { x: number; y: number }; end: { x: number; y: number }; }[];
  getFreePoint: () => { x: number; y: number } | null;
  getSavedStates: () => any[];
  clearSavedStates: () => void;
  clearCanvas: () => void;
  generateRandomPoints: (numPoints: number) => void;
  loadState: (stateIndex: number) => void;
  generateAllMatchings: () => void;
  edit: () => void;
}

export interface FlipGraphNode {
  id: number;
  matching: Matching;
  neighbors: number[];
}

export type FlipGraph = FlipGraphNode[];
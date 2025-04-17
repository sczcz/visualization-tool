// Interface
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

export interface FlipGraphNode {
  id: number;
  matching: Matching;
  neighbors: number[];
}

export type FlipGraph = FlipGraphNode[];
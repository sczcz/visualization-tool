import { Point, Segment } from "../types";


export const snapToGrid = (x: number, y: number, GRID_SIZE: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
});

export const isOnGrid = (point: { x: number, y: number }, GRID_SIZE: number, canvasWidth: number, canvasHeight: number) => {
  // Check if the point is within the visible canvas bounds
  const isWithinBounds = (point.x >= 0 && point.x <= canvasWidth && point.y >= 0 && point.y <= canvasHeight);
  // Check if the point is on a grid line
  const isOnGridLine = (point.x % GRID_SIZE === 0) && (point.y % GRID_SIZE === 0);
  return isWithinBounds && isOnGridLine;
};

export const areCollinear = (p1: Point, p2: Point, p3: Point) => {
    const area = Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
    );
    return Math.abs(area) < 0.0001;
};

export const doesIntersect = (line1: Segment, line2: Segment) => {
    const { start: A, end: B } = line1;
    const { start: C, end: D } = line2;
  
    if ((A.x === C.x && A.y === C.y) || 
        (A.x === D.x && A.y === D.y) || 
        (B.x === C.x && B.y === C.y) || 
        (B.x === D.x && B.y === D.y)) {
      return false;
    }
    
    const orientation = (p: any, q: any, r: any) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0; 
      return val > 0 ? 1 : 2;
    };
  
    const o1 = orientation(A, B, C);
    const o2 = orientation(A, B, D);
    const o3 = orientation(C, D, A);
    const o4 = orientation(C, D, B);
  
    if (o1 !== o2 && o3 !== o4) return true;
  
    return false;
};
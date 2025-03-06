export const snapToGrid = (x: number, y: number, GRID_SIZE: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
});



export const areCollinear = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
    const area = Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
    );
    return Math.abs(area) < 0.0001;
};


export const doesIntersect = (line1: any, line2: any) => {
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
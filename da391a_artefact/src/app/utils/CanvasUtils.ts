import { areCollinear, doesIntersect } from "./MathUtils";

export const wouldCreateCollinearity = (newPoint: { x: number; y: number }, existingPoints: { x: number; y: number }[]) => {
    if (existingPoints.length < 2) return false;
    
    for (let i = 0; i < existingPoints.length; i++) {
      for (let j = i + 1; j < existingPoints.length; j++) {
        if (areCollinear(existingPoints[i], existingPoints[j], newPoint)) {
          return true;
        }
      }
    }
    return false;
  };


export const wouldCrossExistingSegments = (start: { x: number; y: number }, end: { x: number; y: number }, existingLines: any[]) => {
    const newSegment = { start, end };
    return existingLines.some(line => doesIntersect(line, newSegment));
  };
import { areCollinear, doesIntersect } from "./MathUtils";

export const wouldCreateCollinearity = (newPoint: { x: number; y: number }, existingPointsSet: Set<string>) => {
  if (existingPointsSet.size < 2) return false;

  const existingPointsArray = Array.from(existingPointsSet, str => {
      const [x, y] = str.split(",").map(Number);
      return { x, y };
  });

  for (let i = 0; i < existingPointsArray.length; i++) {
      for (let j = i + 1; j < existingPointsArray.length; j++) {
          if (areCollinear(existingPointsArray[i], existingPointsArray[j], newPoint)) {
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
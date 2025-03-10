import { areCollinear, doesIntersect } from "./MathUtils";
import { Point, Segment } from "../types";


export const wouldCreateCollinearity = (newPoint: Point, existingPointsMap: Map<string, Point>) => {
  if (existingPointsMap.size < 2) return false;

  const existingPointsArray = Array.from(existingPointsMap.values());

  for (let i = 0; i < existingPointsArray.length; i++) {
      for (let j = i + 1; j < existingPointsArray.length; j++) {
          if (areCollinear(existingPointsArray[i], existingPointsArray[j], newPoint)) {
              return true;
          }
      }
  }
  return false;
};

export const wouldCrossExistingSegments = (start: Point, end: Point, existingLines: Segment[]) => {
    const newSegment: Segment = { start, end };
    return existingLines.some(line => doesIntersect(line, newSegment));
};
import { FlipGraph, FlipGraphNode, Matching, Segment, Point } from "../types";
import { doesIntersect } from "./MathUtils";


export const buildFlipGraph = (matchings: Matching[]): FlipGraph => {
  const graph: FlipGraph = [];

  for (let i = 0; i < matchings.length; i++) {
    const node: FlipGraphNode = {
      id: i,
      matching: matchings[i],
      neighbors: [],
    };

    for (let j = 0; j < matchings.length; j++) {
      if (i === j) continue;

      if (isOneFlipAway(matchings[i], matchings[j])) {
        node.neighbors.push(j);
      }
    }

    graph.push(node);
  }

  return graph;
};


const isOneFlipAway = (a: Matching, b: Matching): boolean => {
    const segA = a.segments.map(normalizeSegment);
    const segB = b.segments.map(normalizeSegment);
  
    const removed = segA.filter(s => !includesSegment(segB, s));
    const added = segB.filter(s => !includesSegment(segA, s));
  
    if (removed.length !== 1 || added.length !== 1) return false;
    if (!a.freePoint || !b.freePoint) return false;
  
    const [removedSeg] = removed;
    const [addedSeg] = added;
  
    const isSamePoint = (p1: Point, p2: Point) => p1.x === p2.x && p1.y === p2.y;
    const addedPoints = [addedSeg.start, addedSeg.end];
  
    if (!addedPoints.some(p => a.freePoint && isSamePoint(p, a.freePoint))) return false;
  
    const otherSegments = segA.filter(s => !segmentsEqual(s, removedSeg));
    if (otherSegments.some(s => doesIntersect(s, addedSeg))) return false;
  
    return true;
};


const normalizeSegment = (s: Segment): Segment => {
    const a = s.start, b = s.end;
    return (a.x < b.x || (a.x === b.x && a.y < b.y)) ? s : { start: b, end: a };
};


const segmentsEqual = (a: Segment, b: Segment): boolean => {
  return (
    (a.start.x === b.start.x && a.start.y === b.start.y &&
      a.end.x === b.end.x && a.end.y === b.end.y) ||
    (a.start.x === b.end.x && a.start.y === b.end.y &&
      a.end.x === b.start.x && a.end.y === b.start.y)
  );
};


const includesSegment = (list: Segment[], seg: Segment): boolean => {
  return list.some(s => segmentsEqual(s, seg));
};




const GRID_SIZE = 20;
const GRID_ROWS = 700 / GRID_SIZE;

export const convertSavedStatesToMatchings = (savedStates: any[]): Matching[] => {
  return savedStates.map((state) => {
    const pointMap = new Map<string, Point>();
    const segments: Segment[] = [];

    state.lines.forEach((line: any) => {
      const startX = line.start.x * GRID_SIZE;
      const startY = (GRID_ROWS - line.start.y) * GRID_SIZE;
      const endX = line.end.x * GRID_SIZE;
      const endY = (GRID_ROWS - line.end.y) * GRID_SIZE;

      const startKey = `${startX},${startY}`;
      const endKey = `${endX},${endY}`;

      if (!pointMap.has(startKey)) {
        pointMap.set(startKey, { x: startX, y: startY, key: startKey });
      }
      if (!pointMap.has(endKey)) {
        pointMap.set(endKey, { x: endX, y: endY, key: endKey });
      }

      segments.push({
        start: pointMap.get(startKey)!,
        end: pointMap.get(endKey)!,
      });
    });

    let freePoint: Point | null = null;
    if (state.freePoint) {
      const x = state.freePoint.x * GRID_SIZE;
      const y = (GRID_ROWS - state.freePoint.y) * GRID_SIZE;
      const key = `${x},${y}`;
      freePoint = { x, y, key };
      pointMap.set(key, freePoint);
    }

    return {
      pointMap,
      segments,
      freePoint,
    };
  });
};

export const saveFlipGraphToFile = (graph: FlipGraph) => {
  const serializableGraph = graph.map((node) => ({
    id: node.id,
    matching: {
      freePoint: node.matching.freePoint,
      segments: node.matching.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
      })),
    },
    neighbors: node.neighbors,
  }));

  const json = JSON.stringify(serializableGraph, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "flip_graph.json";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};
  

export {
    isOneFlipAway,
    normalizeSegment,
    segmentsEqual,
    includesSegment,
  };
  
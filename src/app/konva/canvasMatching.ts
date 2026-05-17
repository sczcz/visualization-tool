"use client";

import { Dispatch, SetStateAction } from "react";
import { toast } from "react-hot-toast";
import { snapToGrid, doesIntersect, isOnGrid } from "../utils/MathUtils";
import { wouldCreateCollinearity, wouldCrossExistingSegments } from "../utils/CanvasUtils";
import { Point, Segment, Matching } from "../types";

const GRID_SIZE = 20;

export interface CanvasMatchingContext {
  locked: boolean;
  pointMap: Map<string, Point>;
  lines: Segment[];
  pendingPoint: Point | { x: number; y: number } | null;
  freePoint: Point | null;
  savedStates: any[];
  freedPoints: Point[];
  validFlipPoints: Point[];
  position: { x: number; y: number };
  scale: number;
  setPointMap: Dispatch<SetStateAction<Map<string, Point>>>;
  setLines: Dispatch<SetStateAction<Segment[]>>;
  setFreePoint: Dispatch<SetStateAction<Point | null>>;
  setSavedStates: Dispatch<SetStateAction<any[]>>;
  setFreedPoints: Dispatch<SetStateAction<Point[]>>;
  setValidFlipPoints: Dispatch<SetStateAction<Point[]>>;
  setPendingPoint: Dispatch<SetStateAction<Point | { x: number; y: number } | null>>;
  setLocked: Dispatch<SetStateAction<boolean>>;
  setFlashRed: Dispatch<SetStateAction<boolean>>;
  saveStateToHistory: () => void;
}

export const handleCanvasClickAction = (
  context: CanvasMatchingContext,
  e: any
) => {
  const {
    pointMap,
    lines,
    pendingPoint,
    position,
    scale,
    setPointMap,
    setLines,
    setPendingPoint,
    setFreePoint,
    saveStateToHistory,
  } = context;

  saveStateToHistory();

  const stage = e.target.getStage();
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const adjustedX = (pointerPos.x - position.x) / scale;
  const adjustedY = (pointerPos.y - position.y) / scale;
  const snappedPos = snapToGrid(adjustedX, adjustedY, GRID_SIZE);
  const pointKey = `${snappedPos.x},${snappedPos.y}`;

  const canvasWidth = stage.width();
  const canvasHeight = stage.height();

  if (!isOnGrid(snappedPos, GRID_SIZE, canvasWidth, canvasHeight)) {
    toast.error("Points can only be placed on visible grid lines.");
    return;
  }

  if (pointMap.has(pointKey)) {
    toast.error("Cannot place points on top of each other!");
    return;
  }

  if (
    wouldCreateCollinearity(
      { ...snappedPos, key: pointKey },
      pointMap
    )
  ) {
    toast.error("Cannot create collinear points!");
    return;
  }

  if (pendingPoint) {
    const startPoint = {
      ...pendingPoint,
      key: `${pendingPoint.x},${pendingPoint.y}`,
    };
    const endPoint = { ...snappedPos, key: pointKey };

    if (wouldCrossExistingSegments(startPoint, endPoint, lines)) {
      toast.error("Cannot create segment that crosses other lines!");
      return;
    }

    const newMap = new Map(pointMap);
    if (!newMap.has(startPoint.key)) {
      newMap.set(startPoint.key, startPoint);
    }
    newMap.set(pointKey, endPoint);

    const newSegment: Segment = {
      start: newMap.get(startPoint.key)!,
      end: newMap.get(pointKey)!,
    };

    setPointMap(newMap);
    setLines((prevLines) => [...prevLines, newSegment]);
    setPendingPoint(null);
    setFreePoint(newMap.size % 2 === 1 ? newMap.get(pointKey) ?? null : null);
  } else {
    const newPoint = { ...snappedPos, key: pointKey };

    setPointMap((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(pointKey, newPoint);
      return newMap;
    });

    setPendingPoint(snappedPos);

    if (pointMap.size % 2 === 0) {
      setFreePoint(newPoint);
    } else {
      setFreePoint(null);
    }
  }
};

export const handleLineClick = (
  context: CanvasMatchingContext,
  index: number
) => {
  const { locked, freedPoints, freePoint, lines, setLines, setFreedPoints, setValidFlipPoints } = context;

  if (!locked || freedPoints.length > 0) return;

  const removedLine = lines[index];
  const validPoints: Point[] = [];

  if (freePoint && isValidFlip(removedLine.start, freePoint, lines, freedPoints)) {
    validPoints.push(removedLine.start);
  }

  if (freePoint && isValidFlip(removedLine.end, freePoint, lines, freedPoints)) {
    validPoints.push(removedLine.end);
  }

  if (validPoints.length === 0) {
    toast.error("No valid flips possible for this line!");
    return;
  }

  setLines(lines.filter((_, i) => i !== index));
  setFreedPoints([removedLine.start, removedLine.end]);
  setValidFlipPoints(validPoints);
};

export const handleFlipAction = (
  context: CanvasMatchingContext,
  e: any
) => {
  const {
    locked,
    freedPoints,
    freePoint,
    validFlipPoints,
    position,
    scale,
    setLines,
    setFreedPoints,
    setFreePoint,
    setValidFlipPoints,
  } = context;

  if (!locked || freedPoints.length !== 2 || !freePoint) return;

  const stage = e.target.getStage();
  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  const adjustedX = (pointerPos.x - position.x) / scale;
  const adjustedY = (pointerPos.y - position.y) / scale;
  const snappedPos = snapToGrid(adjustedX, adjustedY, GRID_SIZE);

  const isFreedPoint = freedPoints.some(
    (p) => p.x === snappedPos.x && p.y === snappedPos.y
  );

  if (!isFreedPoint) {
    toast.error("Click on one of the freed points to connect!");
    return;
  }

  const isValidFlipPoint = validFlipPoints.some(
    (p) => p.x === snappedPos.x && p.y === snappedPos.y
  );

  if (!isValidFlipPoint) {
    toast.error("This is not a valid flip point!");
    return;
  }

  const newSegment: Segment = {
    start: { ...snappedPos, key: `${snappedPos.x},${snappedPos.y}` },
    end: { ...freePoint, key: `${freePoint.x},${freePoint.y}` },
  };

  const newFreePoint = freedPoints.find(
    (p) => p.x !== snappedPos.x || p.y !== snappedPos.y
  );

  if (!newFreePoint) {
    console.error("Could not find the other freed point");
    return;
  }

  setLines((prevLines) => [...prevLines, newSegment]);
  setFreedPoints([]);
  setFreePoint(newFreePoint);
  setValidFlipPoints([]);
};

export const isValidFlip = (
  freedPoint: Point,
  currentFreePoint: Point | null,
  lines: Segment[],
  freedPoints: Point[]
) => {
  if (!currentFreePoint) return false;

  const newSegment: Segment = {
    start: { ...freedPoint, key: `${freedPoint.x},${freedPoint.y}` },
    end: {
      ...currentFreePoint,
      key: `${currentFreePoint.x},${currentFreePoint.y}`,
    },
  };

  const otherLines: Segment[] = lines
    .filter(
      (line) =>
        !freedPoints.some(
          (fp) =>
            (line.start.x === fp.x && line.start.y === fp.y) ||
            (line.end.x === fp.x && line.end.y === fp.y)
        )
    )
    .map((line) => ({
      start: { ...line.start, key: `${line.start.x},${line.start.y}` },
      end: { ...line.end, key: `${line.end.x},${line.end.y}` },
    }));

  return !otherLines.some((line) => doesIntersect(line, newSegment));
};

export const makeCanonical = (context: CanvasMatchingContext) => {
  const { locked, pointMap, setLines, setFreePoint, saveStateToHistory } = context;

  if (!locked || pointMap.size < 3) {
    toast.error("Cannot make canonical! No locked matching available.");
    return;
  }

  const allPoints = Array.from(pointMap.values());
  const sortedPoints = [...allPoints].sort((a, b) => a.x - b.x);

  const newLines: Segment[] = [];
  let newFreePoint: Point | null = null;

  if (sortedPoints.length % 2 === 1) {
    newFreePoint = sortedPoints[sortedPoints.length - 1];

    for (let i = 0; i < sortedPoints.length - 1; i += 2) {
      newLines.push({
        start: sortedPoints[i],
        end: sortedPoints[i + 1],
      });
    }
  } else {
    for (let i = 0; i < sortedPoints.length; i += 2) {
      newLines.push({
        start: sortedPoints[i],
        end: sortedPoints[i + 1],
      });
    }
  }

  setLines(newLines);
  setFreePoint(newFreePoint);
  toast.success("Successfully transformed to canonical matching!");
  saveStateToHistory();
};

export const generateAllMatchings = (context: CanvasMatchingContext) => {
  const { pointMap, saveStateToHistory, setSavedStates } = context;
  const allPoints = Array.from(pointMap.values());
  const MAX_MATCHINGS = 5000;

  if (allPoints.length % 2 === 0) {
    toast.error("Cannot generate matchings with an even number of points.");
    return;
  }

  const matchingsMap = new Map<string, Matching>();

  const findMatchings = (remaining: Point[], segments: Segment[]) => {
    if (matchingsMap.size >= MAX_MATCHINGS) return;

    if (remaining.length === 1) {
      const sortedSegments = [...segments]
        .map((s) => ({
          start:
            s.start.x < s.end.x ||
            (s.start.x === s.end.x && s.start.y < s.end.y)
              ? s.start
              : s.end,
          end:
            s.start.x < s.end.x ||
            (s.start.x === s.end.x && s.start.y < s.end.y)
              ? s.end
              : s.start,
        }))
        .sort(
          (a, b) =>
            a.start.x - b.start.x ||
            a.start.y - b.start.y ||
            a.end.x - b.end.x ||
            a.end.y - b.end.y
        );

      const matchingString = JSON.stringify(sortedSegments);

      if (!matchingsMap.has(matchingString)) {
        matchingsMap.set(matchingString, {
          pointMap: new Map(pointMap),
          segments: sortedSegments,
          freePoint: remaining[0],
        });
      }

      return;
    }

    for (let i = 0; i < remaining.length - 1; i++) {
      const first = remaining[i];

      for (let j = i + 1; j < remaining.length; j++) {
        const second = remaining[j];

        if (!wouldCrossExistingSegments(first, second, segments)) {
          findMatchings(
            remaining.filter((_, index) => index !== i && index !== j),
            [...segments, { start: first, end: second }]
          );

          if (matchingsMap.size >= MAX_MATCHINGS) return;
        }
      }
    }
  };

  findMatchings(allPoints, []);

  Array.from(matchingsMap.values()).forEach((matching) => saveMatching(context, matching));

  if (matchingsMap.size >= MAX_MATCHINGS) {
    toast(`⚠️ Capped at ${MAX_MATCHINGS} matchings`, { icon: "⏳" });
  }
};

export const saveMatching = (
  context: CanvasMatchingContext,
  matching: Matching
) => {
  const { savedStates, setSavedStates, saveStateToHistory } = context;
  const GRID_ROWS = 700 / GRID_SIZE;

  const uniqueLines = Array.from(
    new Map(
      matching.segments.map((line) => [
        JSON.stringify({
          start: { x: line.start.x, y: line.start.y },
          end: { x: line.end.x, y: line.end.y },
        }),
        line,
      ])
    ).values()
  );

  const newState = {
    segmentCount: uniqueLines.length,
    lines: uniqueLines.map(({ start, end }) => ({
      start: { x: start.x / GRID_SIZE, y: GRID_ROWS - start.y / GRID_SIZE },
      end: { x: end.x / GRID_SIZE, y: GRID_ROWS - end.y / GRID_SIZE },
    })),
    freePoint: matching.freePoint
      ? {
          x: matching.freePoint.x / GRID_SIZE,
          y: GRID_ROWS - matching.freePoint.y / GRID_SIZE,
        }
      : null,
  };

  setSavedStates((prevStates) => [...prevStates, newState]);
  saveStateToHistory();
};

export const saveState = (context: CanvasMatchingContext) => {
  const { lines, freePoint, pointMap, savedStates, setSavedStates, setLocked, setPendingPoint, saveStateToHistory } = context;

  if (lines.length === 0 || freePoint === null || pointMap.size % 2 === 0) {
    toast.error("Cannot save state! Incomplete matching.");
    return;
  }

  const GRID_ROWS = 700 / GRID_SIZE;

  const uniqueLines = Array.from(
    new Map(
      lines.map((line) => [
        JSON.stringify({
          start: { x: line.start.x, y: line.start.y },
          end: { x: line.end.x, y: line.end.y },
        }),
        line,
      ])
    ).values()
  );

  const newState = {
    segmentCount: uniqueLines.length * 2,
    lines: uniqueLines.map(({ start, end }) => ({
      start: { x: start.x / GRID_SIZE, y: GRID_ROWS - start.y / GRID_SIZE },
      end: { x: end.x / GRID_SIZE, y: GRID_ROWS - end.y / GRID_SIZE },
    })),
    freePoint: {
      x: freePoint.x / GRID_SIZE,
      y: GRID_ROWS - freePoint.y / GRID_SIZE,
    },
  };

  const isDuplicate = savedStates.some(
    (state) =>
      JSON.stringify(state.lines) === JSON.stringify(newState.lines) &&
      JSON.stringify(state.freePoint) === JSON.stringify(newState.freePoint)
  );

  if (isDuplicate) {
    toast.error("Cannot save duplicate state!");
    return;
  }

  setSavedStates((prevStates) => [...prevStates, newState]);
  setLocked(true);
  setPendingPoint(null);
  toast.success("Successfully saved matching!");
  saveStateToHistory();
};

export const handleEdit = (context: CanvasMatchingContext) => {
  const { setLocked, freePoint, setPendingPoint } = context;

  setLocked(false);
  if (freePoint) {
    setPendingPoint(freePoint);
  }

  toast.success("Unlocked matching for editing!");
};

export const handleClear = (context: CanvasMatchingContext) => {
  const {
    setPointMap,
    setLines,
    setFreePoint,
    setLocked,
    setFreedPoints,
    setValidFlipPoints,
    setPendingPoint,
    setFlashRed,
    saveStateToHistory,
  } = context;

  setPointMap(new Map());
  setLines([]);
  setFreePoint(null);
  setLocked(false);
  setFreedPoints([]);
  setValidFlipPoints([]);
  setPendingPoint(null);
  setFlashRed(false);
  saveStateToHistory();

  toast.success("Canvas cleared!");
};

export const generateRandomPoints = (
  context: CanvasMatchingContext,
  numPoints: number
) => {
  const {
    setPointMap,
    setLines,
    setFreePoint,
    setLocked,
    setFreedPoints,
    setValidFlipPoints,
    setPendingPoint,
    saveStateToHistory,
  } = context;

  setPointMap(new Map());
  setLines([]);
  setFreePoint(null);
  setLocked(false);
  setFreedPoints([]);
  setValidFlipPoints([]);
  setPendingPoint(null);

  const gridWidth = Math.floor(1200 / GRID_SIZE);
  const gridHeight = Math.floor(700 / GRID_SIZE);
  const newPointMap = new Map<string, Point>();
  const newLines: Segment[] = [];

  const maxAttempts = 20000;
  let totalAttempts = 0;

  const shuffledGrid: { x: number; y: number }[] = [];
  for (let i = 1; i < gridWidth - 1; i++) {
    for (let j = 1; j < gridHeight - 1; j++) {
      shuffledGrid.push({ x: i * GRID_SIZE, y: j * GRID_SIZE });
    }
  }

  shuffledGrid.sort(() => Math.random() - 0.5);

  if (numPoints > shuffledGrid.length) {
    toast.error("Cannot generate more points than available grid positions!");
    return;
  }

  const isValidPoint = (
    point: Point,
    pointMap: Map<string, Point>,
    lines: Segment[]
  ) => {
    if (pointMap.has(point.key)) return false;

    if (pointMap.size >= 2 && wouldCreateCollinearity(point, pointMap)) {
      return false;
    }

    if (pointMap.size % 2 === 1) {
      const previousPoint = [...pointMap.values()].pop();
      if (!previousPoint) return false;

      const newSegment: Segment = { start: previousPoint, end: point };
      if (wouldCrossExistingSegments(newSegment.start, newSegment.end, lines)) {
        return false;
      }
    }

    return true;
  };

  while (newPointMap.size < numPoints && totalAttempts < maxAttempts) {
    totalAttempts += 1;

    let x: number;
    let y: number;
    if (shuffledGrid.length > 0) {
      const point = shuffledGrid.pop();
      if (!point) continue;
      x = point.x;
      y = point.y;
    } else {
      x = Math.floor(Math.random() * (gridWidth - 1) + 1) * GRID_SIZE;
      y = Math.floor(Math.random() * (gridHeight - 1) + 1) * GRID_SIZE;
    }

    const pointKey = `${x},${y}`;
    const newPoint: Point = { x, y, key: pointKey };

    if (!isValidPoint(newPoint, newPointMap, newLines)) continue;

    if (newPointMap.size % 2 === 1) {
      const previousPoint = [...newPointMap.values()].pop();
      if (!previousPoint) continue;

      const newSegment: Segment = { start: previousPoint, end: newPoint };
      if (wouldCrossExistingSegments(newSegment.start, newSegment.end, newLines)) {
        continue;
      }
      newLines.push(newSegment);
    }

    newPointMap.set(pointKey, newPoint);
  }

  setPointMap(newPointMap);
  setLines(newLines);

  const finalPointsArray = [...newPointMap.values()];
  if (finalPointsArray.length % 2 === 1) {
    const lastPoint = finalPointsArray[finalPointsArray.length - 1];
    setFreePoint(lastPoint);
    setPendingPoint(lastPoint);
  } else {
    setFreePoint(null);
    setPendingPoint(null);
  }

  saveStateToHistory();
};

export const loadState = (
  context: CanvasMatchingContext,
  stateIndex: number
) => {
  const {
    savedStates,
    setPointMap,
    setLines,
    setFreePoint,
    setLocked,
    setFreedPoints,
    setValidFlipPoints,
    setPendingPoint,
  } = context;

  if (stateIndex < 0 || stateIndex >= savedStates.length) {
    return;
  }

  const state = savedStates[stateIndex];
  const GRID_ROWS = 700 / GRID_SIZE;
  const newPointMap = new Map<string, Point>();
  const newLines: Segment[] = [];

  state.lines.forEach((line: any) => {
    const startKey = `${line.start.x * GRID_SIZE},${(GRID_ROWS - line.start.y) * GRID_SIZE}`;
    const endKey = `${line.end.x * GRID_SIZE},${(GRID_ROWS - line.end.y) * GRID_SIZE}`;

    if (!newPointMap.has(startKey)) {
      newPointMap.set(startKey, {
        x: line.start.x * GRID_SIZE,
        y: (GRID_ROWS - line.start.y) * GRID_SIZE,
        key: startKey,
      });
    }

    if (!newPointMap.has(endKey)) {
      newPointMap.set(endKey, {
        x: line.end.x * GRID_SIZE,
        y: (GRID_ROWS - line.end.y) * GRID_SIZE,
        key: endKey,
      });
    }

    newLines.push({
      start: newPointMap.get(startKey)!,
      end: newPointMap.get(endKey)!,
    });
  });

  if (state.freePoint) {
    const freePoint: Point = {
      x: state.freePoint.x * GRID_SIZE,
      y: (GRID_ROWS - state.freePoint.y) * GRID_SIZE,
      key: `${state.freePoint.x * GRID_SIZE},${(GRID_ROWS - state.freePoint.y) * GRID_SIZE}`,
    };

    newPointMap.set(freePoint.key, freePoint);
    setFreePoint(freePoint);
  }

  setPointMap(newPointMap);
  setLines(newLines);
  setLocked(true);
  setFreedPoints([]);
  setValidFlipPoints([]);
  setPendingPoint(null);
};

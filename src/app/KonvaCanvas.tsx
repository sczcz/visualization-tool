"use client";

import React from "react";
import CanvasButtons from "./CanvasButtons";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { toast } from "react-hot-toast";
import { snapToGrid, doesIntersect, isOnGrid } from "./utils/MathUtils";
import {
  wouldCreateCollinearity,
  wouldCrossExistingSegments,
} from "./utils/CanvasUtils";
import { Point, Segment, Matching } from "./types";

const GRID_SIZE = 20;

// Define the ref interface
export interface KonvaCanvasRef {
  getPoints: () => { x: number; y: number }[];
  getLines: () => {
    start: { x: number; y: number };
    end: { x: number; y: number };
  }[];
  getFreePoint: () => { x: number; y: number } | null;
  getSavedStates: () => any[];
  clearSavedStates: () => void;
  clearCanvas: () => void;
  generateRandomPoints: (numPoints: number) => void;
  loadState: (stateIndex: number) => void;
  generateAllMatchings: () => void;
  edit: () => void;
}

const KonvaCanvas = forwardRef<KonvaCanvasRef, {}>((props, ref) => {
  const [lines, setLines] = useState<Segment[]>([]);
  const [freePoint, setFreePoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [savedStates, setSavedStates] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [pointMap, setPointMap] = useState(new Map<string, Point>());
  const [freedPoints, setFreedPoints] = useState<{ x: number; y: number }[]>(
    []
  );
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const [flashRed, setFlashRed] = useState(false);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [validFlipPoints, setValidFlipPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [pendingPoint, setPendingPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // New states and refs for undo/redo functionality
  const history = React.useRef<any[]>([]);
  const historyStep = React.useRef(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      // Ctrl+Z for undo
      handleUndo();
    } else if (e.ctrlKey && e.key === "Z" && e.shiftKey) {
      // Ctrl+Shift+Z for redo
      handleRedo();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleUndo = () => {
    if (historyStep.current === 0) {
      return;
    }
    historyStep.current -= 1;
    const previous = history.current[historyStep.current];
    loadStateFromHistory(previous);
  };

  const handleRedo = () => {
    if (historyStep.current === history.current.length - 1) {
      return;
    }
    historyStep.current += 1;
    const next = history.current[historyStep.current];
    loadStateFromHistory(next);
  };

  const handleEdit = () => {
    setLocked(false);
    if (freePoint) {
      setPendingPoint(freePoint);
    }
    toast.success("Unlocked matching for editing!");
  };
  
  const handleClear = () => {
    setPointMap(new Map());
    setLines([]);
    setFreePoint(null);
    setLocked(false);
    setFreedPoints([]);
    setFlashRed(false);
    setValidFlipPoints([]);
    setPendingPoint(null);
    saveStateToHistory();
    toast.success("Canvas cleared!");
  };
  
  const makeCanonical = () => {
    if (!locked || pointMap.size < 3) {
      toast.error("Cannot make canonical! No locked matching available.");
      return;
    }
  
    // Get all points including the free point
    const allPoints = Array.from(pointMap.values());
  
    // Sort points in canonical order (left to right)
    const sortedPoints = [...allPoints].sort((a, b) => a.x - b.x);
  
    // Create new segments in canonical form
    const newLines: Segment[] = [];
    let newFreePoint: Point | null = null;
  
    // If odd number of points, the last one becomes the free point
    if (sortedPoints.length % 2 === 1) {
      newFreePoint = sortedPoints[sortedPoints.length - 1];
  
      // Create segments for pairs of points (0-1, 2-3, etc.)
      for (let i = 0; i < sortedPoints.length - 1; i += 2) {
        newLines.push({
          start: sortedPoints[i],
          end: sortedPoints[i + 1],
        });
      }
    } else {
      // Even number of points, create segments for all pairs
      for (let i = 0; i < sortedPoints.length; i += 2) {
        newLines.push({
          start: sortedPoints[i],
          end: sortedPoints[i + 1],
        });
      }
    }
  
    // Update the canvas state
    setLines(newLines);
    setFreePoint(newFreePoint);
  
    console.log("Transformed to canonical matching");
    toast.success("Successfully transformed to canonical matching!");
    saveStateToHistory();
  };

  const loadStateFromHistory = (state: any) => {
    setLines(state.lines);
    setPointMap(new Map(state.pointMap));
    setFreePoint(state.freePoint);
    setSavedStates(state.savedStates);
    setLocked(state.locked);
    setFreedPoints(state.freedPoints);
    setScale(state.scale);
    setPosition(state.position);
    setFlashRed(state.flashRed);
    setHoveredLineIndex(state.hoveredLineIndex);
    setValidFlipPoints(state.validFlipPoints);
    setPendingPoint(state.pendingPoint);
    setIsDragging(state.isDragging);
    setLastPointerPosition(state.lastPointerPosition);
  };

  const saveStateToHistory = () => {
    const newState = {
      lines,
      pointMap: Array.from(pointMap.entries()),
      freePoint,
      savedStates,
      locked,
      freedPoints,
      scale,
      position,
      flashRed,
      hoveredLineIndex,
      validFlipPoints,
      pendingPoint,
      isDragging,
      lastPointerPosition,
    };

    // Remove all states after current step
    history.current = history.current.slice(0, historyStep.current + 1);
    // Push the new state
    history.current = history.current.concat([newState]);
    historyStep.current += 1;

    // Limit history to the last 20 states
    if (history.current.length > 20) {
      history.current.shift();
      historyStep.current -= 1;
    }
  };

  const saveMatching = (matching: Matching) => {
    if (!matching || !matching.segments || !matching.pointMap) {
      console.error("Invalid matching data:", matching);
      return;
    }

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

    console.log("🔹 Saving Matching", savedStates.length + 1);
    console.table(newState.lines);

    setSavedStates((prevStates) => [...prevStates, newState]);

    saveStateToHistory();
  };

  const generateAllMatchings = () => {
    const allPoints = Array.from(pointMap.values());
    const MAX_MATCHINGS = 5000;

    if (allPoints.length % 2 === 0) {
      toast.error("Cannot generate matchings with an even number of points.");
      return;
    }

    const matchingsMap = new Map<string, Matching>();

    console.log(
      `🔍 Generating all matchings for ${allPoints.length} points...`
    );

    const findMatchings = (remaining: Point[], segments: Segment[]) => {
      // Stop early if we've reached the cap
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

    const finalMatchingsList = Array.from(matchingsMap.values());
    finalMatchingsList.forEach(saveMatching);

    if (matchingsMap.size >= MAX_MATCHINGS) {
      toast(`⚠️ Capped at ${MAX_MATCHINGS} matchings`, { icon: "⏳" });
    }
  };

  // Expose methods and data to parent component via ref
  useImperativeHandle(ref, () => ({
    getPoints: () => Array.from(pointMap.values()),
    getLines: () => lines,
    getFreePoint: () => freePoint,
    getSavedStates: () => savedStates,
    generateAllMatchings,
    edit: () => {
      setLocked(false);
      if (freePoint) {
        setPendingPoint(freePoint);
      }
      toast.success("Unlocked matching for editing!");
    },
    clearSavedStates: () => {
      setSavedStates([]);
      saveStateToHistory();
    },
    clearCanvas: () => {
      setPointMap(new Map());
      setLines([]);
      setFreePoint(null);
      setLocked(false);
      setFreedPoints([]);
      setFlashRed(false);
      setValidFlipPoints([]);
      setPendingPoint(null);
      saveStateToHistory();
    },
    generateRandomPoints: (numPoints: number) => {
      // Clear everything before generating
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
      let backtrackStack: string[] = [];

      // Create shuffled grid positions
      const shuffledGrid: { x: number; y: number }[] = [];
      for (let i = 1; i < gridWidth - 1; i++) {
        for (let j = 1; j < gridHeight - 1; j++) {
          shuffledGrid.push({ x: i * GRID_SIZE, y: j * GRID_SIZE });
        }
      }
      shuffledGrid.sort(() => Math.random() - 0.5);

      if (numPoints > shuffledGrid.length) {
        toast.error(
          "Cannot generate more points than available grid positions!"
        );
        return;
      }

      // Helper function to check if a new point is valid
      const isValidPoint = (
        point: Point,
        pointMap: Map<string, Point>,
        lines: Segment[]
      ) => {
        if (pointMap.has(point.key)) return false; // Avoid duplicates

        if (pointMap.size >= 2 && wouldCreateCollinearity(point, pointMap)) {
          return false;
        }

        if (pointMap.size % 2 === 1) {
          const previousPoint = [...pointMap.values()].pop();
          if (!previousPoint) return false;

          const newSegment: Segment = { start: previousPoint, end: point };

          // Check if the new segment crosses existing ones
          if (
            wouldCrossExistingSegments(newSegment.start, newSegment.end, lines)
          ) {
            return false;
          }
        }

        return true;
      };

      // Generate points and pairs
      while (newPointMap.size < numPoints && totalAttempts < maxAttempts) {
        totalAttempts++;

        let x, y;
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

        // Handle segment pairing
        if (newPointMap.size % 2 === 1) {
          const previousPoint = [...newPointMap.values()].pop();
          if (!previousPoint) continue;

          const newSegment: Segment = { start: previousPoint, end: newPoint };

          // Final intersection check
          if (
            wouldCrossExistingSegments(
              newSegment.start,
              newSegment.end,
              newLines
            )
          ) {
            continue; // Skip if it causes an intersection
          }

          newLines.push(newSegment);
        }

        newPointMap.set(pointKey, newPoint);
        backtrackStack.push(pointKey);
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

      console.log("Generated Points:", finalPointsArray);
      console.log("Generated Segments:", newLines);
      saveStateToHistory();
    },
    loadState: (stateIndex: number) => {
      if (stateIndex >= 0 && stateIndex < savedStates.length) {
        const state = savedStates[stateIndex];

        // Clear the current canvas state
        setPointMap(new Map());
        setLines([]);
        setFreePoint(null);
        setLocked(false);
        setFreedPoints([]);
        setValidFlipPoints([]);
        setPendingPoint(null);

        // Convert the saved state coordinates back to canvas coordinates
        const GRID_ROWS = 700 / GRID_SIZE;
        const newPointMap = new Map<string, Point>(); // 🔹 Store actual `Point` objects
        const newLines: Segment[] = [];

        state.lines.forEach((line: any) => {
          // Convert grid coordinates back to canvas coordinates
          const startKey = `${line.start.x * GRID_SIZE},${
            (GRID_ROWS - line.start.y) * GRID_SIZE
          }`;
          const endKey = `${line.end.x * GRID_SIZE},${
            (GRID_ROWS - line.end.y) * GRID_SIZE
          }`;

          // Ensure each point exists in `newPointMap`
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

          // Add the segment using the stored points
          newLines.push({
            start: newPointMap.get(startKey)!,
            end: newPointMap.get(endKey)!,
          });
        });

        // Add the free point if it exists
        if (state.freePoint) {
          const freePoint: Point = {
            x: state.freePoint.x * GRID_SIZE,
            y: (GRID_ROWS - state.freePoint.y) * GRID_SIZE,
            key: `${state.freePoint.x * GRID_SIZE},${
              (GRID_ROWS - state.freePoint.y) * GRID_SIZE
            }`,
          };

          newPointMap.set(freePoint.key, freePoint);
          setFreePoint(freePoint);
        }

        setPointMap(newPointMap);
        setLines(newLines);
        setLocked(true);

        console.log(`Loaded state ${stateIndex + 1}`);
      }
    },
    
  }));

  const handleCanvasClickAction = (e: any) => {
    saveStateToHistory();
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const adjustedX = (pointerPos.x - position.x) / scale;
    const adjustedY = (pointerPos.y - position.y) / scale;

    const snappedPos = snapToGrid(adjustedX, adjustedY, GRID_SIZE);
    const pointKey = `${snappedPos.x},${snappedPos.y}`;

    // Get the canvas dimensions
    const canvasWidth = stage.width();
    const canvasHeight = stage.height();

    // Check if the snapped position is on the visible grid
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
        { ...snappedPos, key: `${snappedPos.x},${snappedPos.y}` },
        pointMap
      )
    ) {
      toast.error("Cannot create collinear points!");
      return;
    }

    if (pendingPoint) {
      // Create proper Point objects
      const startPoint = {
        ...pendingPoint,
        key: `${pendingPoint.x},${pendingPoint.y}`,
      };
      const endPoint = { ...snappedPos, key: pointKey };

      // First check if the segment would cross existing lines
      if (wouldCrossExistingSegments(startPoint, endPoint, lines)) {
        toast.error("Cannot create segment that crosses other lines!");
        return;
      }

      // Update the point map first
      const newMap = new Map(pointMap);
      // Make sure both points are in the map
      if (!newMap.has(startPoint.key)) {
        newMap.set(startPoint.key, startPoint);
      }
      newMap.set(pointKey, endPoint);

      // Create segment using the actual points from the map
      const newSegment: Segment = {
        start: newMap.get(startPoint.key)!,
        end: newMap.get(pointKey)!,
      };

      setPointMap(newMap);
      setLines((prevLines) => [...prevLines, newSegment]);
      setPendingPoint(null);

      // Set free point based on odd/even count
      setFreePoint(newMap.size % 2 === 1 ? newMap.get(pointKey) ?? null : null);
    } else {
      // Add the first point
      const newPoint = { ...snappedPos, key: pointKey };
      setPointMap((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.set(pointKey, newPoint);
        return newMap;
      });

      setPendingPoint(snappedPos);

      // Update free point if needed
      if (pointMap.size % 2 === 0) {
        // Will be odd after adding this point
        setFreePoint(newPoint);
      } else {
        setFreePoint(null);
      }
    }
  };

  const saveState = () => {
    if (lines.length === 0 || freePoint === null || pointMap.size % 2 == 0) {
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

    console.log("🔹 Saved Matching", savedStates.length + 1);
    console.table(newState.lines);

    setSavedStates((prevStates) => [...prevStates, newState]);

    setLocked(true);
    setPendingPoint(null);
    toast.success("Successfully saved matching!");
  };

  // Handle mouse wheel event for zooming
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    // Calculate new scale: zoom in when scrolling up, zoom out when scrolling down
    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;

    // Limit zoom levels (optional)
    const limitedScale = Math.min(Math.max(newScale, 0.3), 5);

    // Calculate new position so we zoom to where the mouse is
    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };

    setScale(limitedScale);
    setPosition(newPos);
  };

  const handleMouseDown = (e: any) => {
    const buttonCode = e.evt.button;

    // Middle button for panning (button code 1)
    if (buttonCode === 1) {
      e.evt.preventDefault();
      setIsDragging(true);

      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      setLastPointerPosition(pointerPos);
      return;
    }

    // Left button for interactions (button code 0)
    if (buttonCode === 0) {
      if (locked) {
        // Call your flip handler
        handleFlipAction(e);
      } else {
        // Call your canvas click handler
        handleCanvasClickAction(e);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging || !lastPointerPosition) return;

    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    // Calculate how far the mouse has moved
    const dx = pointerPos.x - lastPointerPosition.x;
    const dy = pointerPos.y - lastPointerPosition.y;

    // Update position
    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    // Update last position
    setLastPointerPosition(pointerPos);
  };

  const handleMouseUp = (e: any) => {
    if (e.evt.button === 1) {
      setIsDragging(false);
      setLastPointerPosition(null);
    }
  };

  // Add mouseout handler to stop dragging if mouse leaves the canvas
  const handleMouseOut = () => {
    setIsDragging(false);
    setLastPointerPosition(null);
  };

  // Check if a potential flip would be valid
  const isValidFlip = (
    freedPoint: { x: number; y: number },
    currentFreePoint: { x: number; y: number } | null
  ) => {
    if (!currentFreePoint) return false;

    // Create the potential new segment
    const newSegment: Segment = {
      start: { ...freedPoint, key: `${freedPoint.x},${freedPoint.y}` },
      end: {
        ...currentFreePoint,
        key: `${currentFreePoint.x},${currentFreePoint.y}`,
      },
    };

    // Filter out any lines that contain the freed points (since they'll be removed)
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

  const handleLineClick = (index: number) => {
    if (!locked || freedPoints.length > 0) return;

    const removedLine = lines[index];

    // Check which flips would be valid
    const validPoints: { x: number; y: number }[] = [];

    // Check if connecting start point to free point would be valid
    if (freePoint && isValidFlip(removedLine.start, freePoint)) {
      validPoints.push(removedLine.start);
    }

    // Check if connecting end point to free point would be valid
    if (freePoint && isValidFlip(removedLine.end, freePoint)) {
      validPoints.push(removedLine.end);
    }

    if (validPoints.length === 0) {
      toast.error("No valid flips possible for this line!");
      return;
    }

    // If we get here, at least one valid flip is possible
    // Create a new array without the removed line
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
    setFreedPoints([removedLine.start, removedLine.end]);
    setValidFlipPoints(validPoints);

    console.log(
      `Removed line at index ${index}, freed points:`,
      removedLine.start,
      removedLine.end
    );
    console.log(`Valid flip points:`, validPoints);
  };

  const handleLineHover = (index: number) => {
    if (locked) {
      setHoveredLineIndex(index);
    }
  };

  const handleLineLeave = () => {
    setHoveredLineIndex(null);
  };

  const handleFlipAction = (e: any) => {
    if (!locked || freedPoints.length !== 2 || !freePoint) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Adjust for scale and position
    const adjustedX = (pointerPos.x - position.x) / scale;
    const adjustedY = (pointerPos.y - position.y) / scale;

    const snappedPos = snapToGrid(adjustedX, adjustedY, GRID_SIZE);

    // Check if the clicked point is one of the freed points
    const isFreedPoint = freedPoints.some(
      (p) => p.x === snappedPos.x && p.y === snappedPos.y
    );

    if (!isFreedPoint) {
      toast.error("Click on one of the freed points to connect!");
      return;
    }

    // Check if this is a valid flip point
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

    // The new free point is the other freed point
    const newFreePoint = freedPoints.find(
      (p) => p.x !== snappedPos.x || p.y !== snappedPos.y
    );

    if (!newFreePoint) {
      console.error("Could not find the other freed point");
      return;
    }

    // Add the new line
    setLines((prevLines) => [...prevLines, newSegment]);
    setFreedPoints([]);
    setFreePoint(newFreePoint);
    setValidFlipPoints([]);

    console.log(
      `Added new line from (${snappedPos.x}, ${snappedPos.y}) to (${freePoint.x}, ${freePoint.y})`
    );
    console.log(`New free point: (${newFreePoint.x}, ${newFreePoint.y})`);
  };

  return (
    <div className="flex flex-col items-center mt-5">
      
      <CanvasButtons
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        setScale={setScale}
        setPosition={setPosition}
        saveState={saveState}
        onEdit={handleEdit}
        onClear={handleClear}
        onLoadCanonical={makeCanonical}
        onGenerateAllMatchings={generateAllMatchings}
      />
      <div
        className={`inline-block border ${
          flashRed ? "border-4 border-red-500" : "border-2 border-black"
        } transition-all duration-300`}
      >
        <Stage
          width={1200}
          height={700}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseOut}
          className={`bg-gray-100 ${
            isDragging ? "cursor-grabbing" : "cursor-default"
          }`}
        >
          <Layer>
            {/* Grid lines */}
            {[...Array(1200 / GRID_SIZE)].map((_, i) => (
              <Line
                key={`grid-v-${i}`}
                points={[i * GRID_SIZE, 0, i * GRID_SIZE, 700]}
                stroke="#ddd"
              />
            ))}
            {[...Array(700 / GRID_SIZE)].map((_, i) => (
              <Line
                key={`grid-h-${i}`}
                points={[0, i * GRID_SIZE, 1200, i * GRID_SIZE]}
                stroke="#ddd"
              />
            ))}

            {/* Matching lines */}
            {lines.map((line, i) => (
              <React.Fragment key={`line-${i}`}>
                <Line
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke="rgba(0,0,0,0)"
                  strokeWidth={30}
                  onClick={() => handleLineClick(i)}
                  onMouseEnter={() => handleLineHover(i)}
                  onMouseLeave={handleLineLeave}
                />
                <Line
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke={
                    hoveredLineIndex === i && locked ? "#ff6b6b" : "black"
                  }
                  strokeWidth={hoveredLineIndex === i && locked ? 3 : 2}
                  listening={false}
                />
              </React.Fragment>
            ))}

            {/* Points */}
            {Array.from(pointMap.values()).map((point, i) => (
              <Circle
                key={`point-${i}`}
                x={point.x}
                y={point.y}
                radius={5}
                fill="blue"
              />
            ))}

            {/* Free point */}
            {freePoint && (
              <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />
            )}

            {/* Pending point */}
            {pendingPoint && (
              <Circle
                x={pendingPoint.x}
                y={pendingPoint.y}
                radius={6}
                fill="purple"
                stroke="black"
                strokeWidth={1}
              />
            )}

            {/* Freed points */}
            {freedPoints.map((p, i) => {
              const isValidFlip = validFlipPoints.some(
                (vp) => vp.x === p.x && vp.y === p.y
              );
              return (
                <Circle
                  key={`freed-${i}`}
                  x={p.x}
                  y={p.y}
                  radius={7}
                  fill={isValidFlip ? "green" : "orange"}
                  stroke="black"
                  strokeWidth={1}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>
      {/* Action buttons */}
    </div>
  );
});

KonvaCanvas.displayName = "KonvaCanvas";

export default KonvaCanvas;


"use client";

import React from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { toast } from 'react-hot-toast';
import { snapToGrid, doesIntersect } from "./utils/MathUtils";
import {
  wouldCreateCollinearity,
  wouldCrossExistingSegments,
} from "./utils/CanvasUtils";
import { Point, Segment, Matching } from "./types";

const GRID_SIZE = 50;

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
  makeCanonical: () => void;
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
  // const [error, setError] = useState<string | null>(null);
  const [flashRed, setFlashRed] = useState(false);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [validFlipPoints, setValidFlipPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [pendingPoint, setPendingPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const saveMatching = (matching: Matching) => {
    if (!matching || !matching.segments || !matching.pointMap) {
      console.error("Invalid matching data:", matching);
      return;
    }
  
    const GRID_ROWS = 600 / GRID_SIZE;
  
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
  };
  
  const generateAllMatchings = () => {
    const allPoints = Array.from(pointMap.values());
  
    if (allPoints.length % 2 === 0) {
      toast.error("Cannot generate matchings with an even number of points.")
      return;
    }
  
    const matchingsMap = new Map<string, Matching>(); // Store unique matchings
  
    console.log(`🔍 Generating all matchings for ${allPoints.length} points...`);
  
    const findMatchings = (remaining: Point[], segments: Segment[]) => {
      if (remaining.length === 1) {
        // Ensure order-independent comparison
        const sortedSegments = [...segments].map(s => ({
          start: s.start.x < s.end.x || (s.start.x === s.end.x && s.start.y < s.end.y)
            ? s.start : s.end,
          end: s.start.x < s.end.x || (s.start.x === s.end.x && s.start.y < s.end.y)
            ? s.end : s.start,
        })).sort((a, b) => 
          a.start.x - b.start.x || a.start.y - b.start.y || 
          a.end.x - b.end.x || a.end.y - b.end.y
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
          }
        }
      }
    };
  
    findMatchings(allPoints, []);
  
    const finalMatchingsList = Array.from(matchingsMap.values());
    finalMatchingsList.forEach(saveMatching);
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
      

      const gridWidth = Math.floor(800 / GRID_SIZE);
      const gridHeight = Math.floor(600 / GRID_SIZE);
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
        toast.error("Cannot generate more points than available grid positions!");
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
        const GRID_ROWS = 600 / GRID_SIZE;
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
    makeCanonical: () => {
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
      toast.success("Successfully transformed to canonical matching!")
    },
  }));

  const handleCanvasClick = (e: any) => {
    if (locked) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y, GRID_SIZE);
    const pointKey = `${snappedPos.x},${snappedPos.y}`;

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
    // In handleCanvasClick function, modify this section:
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

    const GRID_ROWS = 600 / GRID_SIZE;

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
    toast.success('Successfully saved matching!')
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

  const handleFlip = (e: any) => {
    if (!locked || freedPoints.length !== 2 || !freePoint) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y, GRID_SIZE);

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
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <button
        onClick={saveState}
        style={{ marginBottom: "10px", padding: "8px", cursor: "pointer" }}
      >
        Save Configuration
      </button>

      <div
        style={{
          display: "inline-block",
          border: flashRed ? "4px solid red" : "2px solid black",
          transition: "border 0.3s ease",
        }}
      >
        <Stage
          width={800}
          height={600}
          onClick={locked ? handleFlip : handleCanvasClick}
          style={{ backgroundColor: "#f9f9f9" }}
        >
          <Layer>
            {/* Grid lines */}
            {[...Array(800 / GRID_SIZE)].map((_, i) => (
              <Line
                key={`grid-v-${i}`}
                points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]}
                stroke="#ddd"
              />
            ))}
            {[...Array(600 / GRID_SIZE)].map((_, i) => (
              <Line
                key={`grid-h-${i}`}
                points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]}
                stroke="#ddd"
              />
            ))}

            {/* Render lines with both visible thin line and invisible thick hitbox */}
            {lines.map((line, i) => (
              <React.Fragment key={`line-${i}`}>
                {/* Invisible thick line for better hit detection */}
                <Line
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke="rgba(0,0,0,0)"
                  strokeWidth={15}
                  onClick={() => handleLineClick(i)}
                  onMouseEnter={() => handleLineHover(i)}
                  onMouseLeave={handleLineLeave}
                />
                {/* Visible thin line */}
                <Line
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke={
                    hoveredLineIndex === i && locked ? "#ff6b6b" : "black"
                  }
                  strokeWidth={hoveredLineIndex === i && locked ? 3 : 2}
                  listening={false} // This line doesn't handle events
                />
              </React.Fragment>
            ))}

            {/* Render points */}
            {Array.from(pointMap.values()).map((point, i) => (
              <Circle
                key={`point-${i}`}
                x={point.x}
                y={point.y}
                radius={5}
                fill="blue"
              />
            ))}

            {/* Render free point */}
            {freePoint && (
              <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />
            )}

            {/* Highlight pending point */}
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

            {/* Highlight freed points with different colors based on validity */}
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

      {/* <div style={{ marginTop: "20px" }}>
       
      </div> */}
    </div>
  );
});

KonvaCanvas.displayName = "KonvaCanvas";

export default KonvaCanvas;

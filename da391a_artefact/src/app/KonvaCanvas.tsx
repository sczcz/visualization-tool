"use client";

import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect } from "react";

const GRID_SIZE = 50;

export default function KonvaCanvas() {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [lines, setLines] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [freePoint, setFreePoint] = useState<{ x: number; y: number } | null>(null);
  const [savedStates, setSavedStates] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [freedPoints, setFreedPoints] = useState<{ x: number; y: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flashRed, setFlashRed] = useState(false);

  const snapToGrid = (x: number, y: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  const doesIntersect = (line1: any, line2: any) => {
    const { start: A, end: B } = line1;
    const { start: C, end: D } = line2;
  
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

  const handleCanvasClick = (e: any) => {
    if (locked) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
  
    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y);
  
    setPoints((prevPoints) => {
      const newPoints = [...prevPoints, snappedPos];
  
      if (newPoints.length % 2 === 1) {
        setFreePoint(snappedPos);
        return newPoints;
      }
  
      const newSegment = {
        start: newPoints[newPoints.length - 2],
        end: newPoints[newPoints.length - 1],
      };
  
      const hasIntersection = lines.some((existingLine) => doesIntersect(existingLine, newSegment));
  
      if (hasIntersection) {
        setError("DO NOT CROSS LINES!!!");
        setFlashRed(true);
        setTimeout(() => {
          setError(null);
          setFlashRed(false);
        }, 1500);
        return prevPoints;
      }
  
      setLines((prevLines) => [...prevLines, newSegment]);
      return newPoints;
    });
  };

  const saveState = () => {
    if (lines.length === 0 || freePoint === null) {
      setError("CANNOT SAVE! NO VALID CONFIG!!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    const GRID_ROWS = 600 / GRID_SIZE;
    
    const uniqueLines = Array.from(
      new Map(
        lines.map(line => [
          JSON.stringify({
            start: { x: line.start.x, y: line.start.y },
            end: { x: line.end.x, y: line.end.y },
          }),
          line,
        ])
      ).values()
    );

    const newState = {
      segmentCount: savedStates.length === 0 ? lines.length : savedStates[savedStates.length - 1].segmentCount,

      lines: uniqueLines.map(({ start, end }) => ({
        start: { x: start.x / GRID_SIZE, y: GRID_ROWS - start.y / GRID_SIZE },
        end: { x: end.x / GRID_SIZE, y: GRID_ROWS - end.y / GRID_SIZE },
      })),
      freePoint: { x: freePoint.x / GRID_SIZE, y: GRID_ROWS - freePoint.y / GRID_SIZE },
    };

    console.log("🔹 Saved Matching", savedStates.length + 1);
    console.table(newState.lines);
    
    setSavedStates((prevStates) => [...prevStates, newState]);
    setLocked(true);
  };

  const handleLineClick = (index: number) => {
    if (!locked) return;

    const removedLine = lines[index];
    setLines(lines.filter((_, i) => i !== index));

    
    setFreedPoints([removedLine.start, removedLine.end]);
    setError(null);
  };

  const handleFlip = (e: any) => {
    if (!locked || freedPoints.length !== 2) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y);

    if (
      !(
        (snappedPos.x === freedPoints[0].x && snappedPos.y === freedPoints[0].y) ||
        (snappedPos.x === freedPoints[1].x && snappedPos.y === freedPoints[1].y)
      )
    ) {
      setError("You must connect a freed point to the old free point!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    const newSegment = { start: snappedPos, end: freePoint! };

    const hasIntersection = lines.some((existingLine) => doesIntersect(existingLine, newSegment));
    if (hasIntersection) {
      setError("DO NOT CROSS LINES!!!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    const newFreePoint =
    snappedPos.x === freedPoints[0].x && snappedPos.y === freedPoints[0].y ? freedPoints[1] : freedPoints[0];

    setLines([...lines, newSegment]);
    setFreedPoints([]);
    setFreePoint(newFreePoint);
  };
  

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      {error && (
        <div style={{ color: "red", fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      <button onClick={saveState} style={{ marginBottom: "10px", padding: "8px", cursor: "pointer" }}>
        Save Configuration
      </button>

      <div
        style={{
          display: "inline-block",
          border: flashRed ? "4px solid red" : "2px solid black",
          transition: "border 0.3s ease",
        }}
      >
        <Stage width={800} height={600} onClick={locked ? handleFlip : handleCanvasClick} style={{ backgroundColor: "#f9f9f9" }}>
          <Layer>
            {[...Array(800 / GRID_SIZE)].map((_, i) => (
              <Line key={i} points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]} stroke="#ddd" />
            ))}
            {[...Array(600 / GRID_SIZE)].map((_, i) => (
              <Line key={i} points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]} stroke="#ddd" />
            ))}

            {lines.map((line, i) => (
              <Line key={i} points={[line.start.x, line.start.y, line.end.x, line.end.y]} stroke="black" strokeWidth={2} onClick={() => handleLineClick(i)} />
            ))}

            {points.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={5} fill="blue" />
            ))}

            {freePoint && <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />}
          </Layer>
        </Stage>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Saved Configurations</h3>
        <ul>
          {savedStates.map((state, index) => (
            <li key={index}>
              Matching {index + 1} → {state.segmentCount/2} line segments, Free Point at ({state.freePoint.x}, {state.freePoint.y})
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

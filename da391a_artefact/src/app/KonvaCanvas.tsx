"use client";

import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect } from "react";

const GRID_SIZE = 50;

export default function KonvaCanvas() {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [lines, setLines] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [freePoint, setFreePoint] = useState<{ x: number; y: number } | null>(null);
  const [savedStates, setSavedStates] = useState<any[]>([]);
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

    const newState = {
      lines: lines.map(({ start, end }) => ({
        start: { x: start.x / GRID_SIZE, y: GRID_ROWS - start.y / GRID_SIZE },
        end: { x: end.x / GRID_SIZE, y: GRID_ROWS - end.y / GRID_SIZE },
      })),
      freePoint: { x: freePoint.x / GRID_SIZE, y: GRID_ROWS - freePoint.y / GRID_SIZE },
    };
    
    setSavedStates((prevStates) => [...prevStates, newState]);
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
        <Stage width={800} height={600} onClick={handleCanvasClick} style={{ backgroundColor: "#f9f9f9" }}>
          <Layer>
            {[...Array(800 / GRID_SIZE)].map((_, i) => (
              <Line key={i} points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]} stroke="#ddd" />
            ))}
            {[...Array(600 / GRID_SIZE)].map((_, i) => (
              <Line key={i} points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]} stroke="#ddd" />
            ))}

            {lines.map((line, i) => (
              <Line key={i} points={[line.start.x, line.start.y, line.end.x, line.end.y]} stroke="black" strokeWidth={2} />
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
              Config {index + 1} → {state.lines.length/2} segments, Free Point at ({state.freePoint.x}, {state.freePoint.y})
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

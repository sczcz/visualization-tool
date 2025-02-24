"use client";

import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState } from "react";

const GRID_SIZE = 50;

export default function KonvaCanvas() {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [lines, setLines] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [freePoint, setFreePoint] = useState<{ x: number; y: number } | null>(null);

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
        console.log("DO NOT CROSS LINES!!!");
        return newPoints;
      }
      
      setLines((prevLines) => [...prevLines, newSegment]);
      return newPoints;
    });
  };
  

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stage width={800} height={600} onClick={handleCanvasClick} style={{ backgroundColor: "#f9f9f9" }}>
        <Layer>
          {[...Array(800 / GRID_SIZE)].map((_, i) => (
            <Line key={i} points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]} stroke="#ddd" />
          ))}
          {[...Array(600 / GRID_SIZE)].map((_, i) => (
            <Line key={i} points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]} stroke="#ddd" />
          ))}

          {lines.map((line, i) => (
            <Line
              key={i}
              points={[line.start.x, line.start.y, line.end.x, line.end.y]}
              stroke="black"
              strokeWidth={2}
            />
          ))}

          {points.map((p, i) => (
            <Circle key={i} x={p.x} y={p.y} radius={5} fill="blue" />
          ))}

          {freePoint && <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />}
        </Layer>
      </Stage>
    </div>
  );
}

"use client";

import { Stage, Layer, Line, Circle } from "react-konva";
import { useState } from "react";

const GRID_SIZE = 50;

export default function KonvaCanvas() {
  const [lines, setLines] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const snapToGrid = (x: number, y: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  const handleCanvasClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y);

    setPoints([...points, snappedPos]);

    if (points.length === 1) {
      setLines([...lines, { start: points[0], end: snappedPos }]);
      setPoints([]);
    }
  };

  return (
    <Stage width={800} height={600} onClick={handleCanvasClick} style={{ backgroundColor: "#f9f9f9" }}>
      <Layer>
        {[...Array(800 / GRID_SIZE)].map((_, i) => (
          <Line key={i} points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]} stroke="#ddd" />
        ))}
        {[...Array(600 / GRID_SIZE)].map((_, i) => (
          <Line key={i} points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]} stroke="#ddd" />
        ))}
        {points.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={5} fill="blue" />
        ))}
        {lines.map((line, i) => (
          <Line key={i} points={[line.start.x, line.start.y, line.end.x, line.end.y]} stroke="black" strokeWidth={2} />
        ))}
      </Layer>
    </Stage>
  );
}

"use client";

import React from "react";
import { Line } from "react-konva";

interface CanvasGridProps {
  width: number;
  height: number;
  gridSize: number;
}

const CanvasGrid: React.FC<CanvasGridProps> = ({ width, height, gridSize }) => {
  return (
    <>
      {[...Array(Math.ceil(width / gridSize))].map((_, i) => (
        <Line
          key={`grid-v-${i}`}
          points={[i * gridSize, 0, i * gridSize, height]}
          stroke="#ddd"
        />
      ))}
      {[...Array(Math.ceil(height / gridSize))].map((_, i) => (
        <Line
          key={`grid-h-${i}`}
          points={[0, i * gridSize, width, i * gridSize]}
          stroke="#ddd"
        />
      ))}
    </>
  );
};

export default CanvasGrid;

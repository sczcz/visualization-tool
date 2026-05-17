"use client";

import React from "react";
import { Circle } from "react-konva";
import { Point } from "../types";

interface CanvasPointsProps {
  pointMap: Map<string, Point>;
  freePoint: Point | null;
  pendingPoint: { x: number; y: number } | null;
  freedPoints: Point[];
  validFlipPoints: Point[];
}

const CanvasPoints: React.FC<CanvasPointsProps> = ({
  pointMap,
  freePoint,
  pendingPoint,
  freedPoints,
  validFlipPoints,
}) => {
  return (
    <>
      {Array.from(pointMap.values()).map((point) => (
        <Circle
          key={point.key}
          x={point.x}
          y={point.y}
          radius={5}
          fill="blue"
        />
      ))}

      {freePoint && <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />}

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
    </>
  );
};

export default CanvasPoints;

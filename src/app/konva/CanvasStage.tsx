"use client";

import React from "react";
import { Stage, Layer } from "react-konva";
import CanvasGrid from "./canvasGrid";
import CanvasLines from "./canvasLines";
import CanvasPoints from "./canvasPoints";
import { Point, Segment } from "../types";

interface CanvasStageProps {
  width: number;
  height: number;
  gridSize: number;
  scale: number;
  position: { x: number; y: number };
  flashRed: boolean;
  isDragging: boolean;
  onWheel: (e: any) => void;
  onMouseDown: (e: any) => void;
  onMouseMove: (e: any) => void;
  onMouseUp: (e: any) => void;
  onMouseLeave: () => void;
  lines: Segment[];
  hoveredLineIndex: number | null;
  locked: boolean;
  onLineClick: (index: number) => void;
  onLineHover: (index: number) => void;
  onLineLeave: () => void;
  pointMap: Map<string, Point>;
  freePoint: Point | null;
  pendingPoint: { x: number; y: number } | null;
  freedPoints: Point[];
  validFlipPoints: Point[];
}

const CanvasStage: React.FC<CanvasStageProps> = ({
  width,
  height,
  gridSize,
  scale,
  position,
  flashRed,
  isDragging,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  lines,
  hoveredLineIndex,
  locked,
  onLineClick,
  onLineHover,
  onLineLeave,
  pointMap,
  freePoint,
  pendingPoint,
  freedPoints,
  validFlipPoints,
}) => {
  return (
    <div
      className={`inline-block border ${
        flashRed ? "border-4 border-red-500" : "border-2 border-black"
      } transition-all duration-300`}
    >
      <Stage
        width={width}
        height={height}
        onWheel={onWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className={`bg-gray-100 ${
          isDragging ? "cursor-grabbing" : "cursor-default"
        }`}
      >
        <Layer>
          <CanvasGrid width={width} height={height} gridSize={gridSize} />
          <CanvasLines
            lines={lines}
            hoveredLineIndex={hoveredLineIndex}
            locked={locked}
            onLineClick={onLineClick}
            onLineHover={onLineHover}
            onLineLeave={onLineLeave}
          />
          <CanvasPoints
            pointMap={pointMap}
            freePoint={freePoint}
            pendingPoint={pendingPoint}
            freedPoints={freedPoints}
            validFlipPoints={validFlipPoints}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasStage;

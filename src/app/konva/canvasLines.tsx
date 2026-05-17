"use client";

import React from "react";
import { Line } from "react-konva";
import { Segment } from "../types";

interface CanvasLinesProps {
  lines: Segment[];
  hoveredLineIndex: number | null;
  locked: boolean;
  onLineClick: (index: number) => void;
  onLineHover: (index: number) => void;
  onLineLeave: () => void;
}

const CanvasLines: React.FC<CanvasLinesProps> = ({
  lines,
  hoveredLineIndex,
  locked,
  onLineClick,
  onLineHover,
  onLineLeave,
}) => {
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={`line-${i}`}>
          <Line
            points={[line.start.x, line.start.y, line.end.x, line.end.y]}
            stroke="rgba(0,0,0,0)"
            strokeWidth={30}
            onClick={() => onLineClick(i)}
            onMouseEnter={() => onLineHover(i)}
            onMouseLeave={onLineLeave}
          />
          <Line
            points={[line.start.x, line.start.y, line.end.x, line.end.y]}
            stroke={hoveredLineIndex === i && locked ? "#ff6b6b" : "black"}
            strokeWidth={hoveredLineIndex === i && locked ? 3 : 2}
            listening={false}
          />
        </React.Fragment>
      ))}
    </>
  );
};

export default CanvasLines;

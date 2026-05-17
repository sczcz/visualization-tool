"use client";

import React, { useState, useImperativeHandle, forwardRef } from "react";
import CanvasButtons from "./CanvasButtons";
import CanvasStage from "./konva/CanvasStage";
import { useCanvasHistory } from "./konva/canvasHistory";
import { useCanvasInteraction } from "./konva/canvasInteraction";
import {
  handleLineClick,
  makeCanonical,
  generateAllMatchings,
  saveState,
  handleEdit,
  handleClear,
  generateRandomPoints,
  loadState,
} from "./konva/canvasMatching";
import { KonvaCanvasRef, Point, Segment } from "./types";

const GRID_SIZE = 20;

const KonvaCanvas = forwardRef<KonvaCanvasRef, {}>((props, ref) => {
  const [lines, setLines] = useState<Segment[]>([]);
  const [freePoint, setFreePoint] = useState<Point | null>(null);
  const [savedStates, setSavedStates] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [pointMap, setPointMap] = useState(new Map<string, Point>());
  const [freedPoints, setFreedPoints] = useState<Point[]>([]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [flashRed, setFlashRed] = useState(false);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [validFlipPoints, setValidFlipPoints] = useState<Point[]>([]);
  const [pendingPoint, setPendingPoint] = useState<Point | { x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);

  const historyContext = {
    lines,
    pointMap,
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
    setLines,
    setPointMap,
    setFreePoint,
    setSavedStates,
    setLocked,
    setFreedPoints,
    setScale,
    setPosition,
    setFlashRed,
    setHoveredLineIndex,
    setValidFlipPoints,
    setPendingPoint,
    setIsDragging,
    setLastPointerPosition,
  };

  const { handleUndo, handleRedo, saveStateToHistory } = useCanvasHistory(historyContext);

  const matchingContext = {
    locked,
    pointMap,
    lines,
    pendingPoint,
    freePoint,
    savedStates,
    freedPoints,
    validFlipPoints,
    position,
    scale,
    setPointMap,
    setLines,
    setFreePoint,
    setSavedStates,
    setFreedPoints,
    setValidFlipPoints,
    setPendingPoint,
    setLocked,
    setFlashRed,
    saveStateToHistory,
  };

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
    handleWheel,
    handleLineHover,
    handleLineLeave,
  } = useCanvasInteraction({
    locked,
    position,
    scale,
    isDragging,
    lastPointerPosition,
    setPosition,
    setScale,
    setIsDragging,
    setLastPointerPosition,
    setHoveredLineIndex,
    matchingContext,
    handleUndo,
    handleRedo,
  });

  useImperativeHandle(ref, () => ({
    getPoints: () => Array.from(pointMap.values()),
    getLines: () => lines,
    getFreePoint: () => freePoint,
    getSavedStates: () => savedStates,
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
      generateRandomPoints(matchingContext, numPoints);
    },
    loadState: (stateIndex: number) => {
      loadState(matchingContext, stateIndex);
    },
    generateAllMatchings: () => {
      generateAllMatchings(matchingContext);
    },
    edit: () => {
      handleEdit(matchingContext);
    },
  }));

  return (
    <div className="flex flex-col items-center mt-5">
      <CanvasButtons
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        setScale={setScale}
        setPosition={setPosition}
        saveState={() => saveState(matchingContext)}
        onEdit={() => handleEdit(matchingContext)}
        onClear={() => handleClear(matchingContext)}
        onLoadCanonical={() => makeCanonical(matchingContext)}
        onGenerateAllMatchings={() => generateAllMatchings(matchingContext)}
      />
      <CanvasStage
        width={1200}
        height={700}
        gridSize={GRID_SIZE}
        scale={scale}
        position={position}
        flashRed={flashRed}
        isDragging={isDragging}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseOut}
        lines={lines}
        hoveredLineIndex={hoveredLineIndex}
        locked={locked}
        onLineClick={(index) => handleLineClick(matchingContext, index)}
        onLineHover={handleLineHover}
        onLineLeave={handleLineLeave}
        pointMap={pointMap}
        freePoint={freePoint}
        pendingPoint={pendingPoint}
        freedPoints={freedPoints}
        validFlipPoints={validFlipPoints}
      />
    </div>
  );
});

KonvaCanvas.displayName = "KonvaCanvas";
export default KonvaCanvas;

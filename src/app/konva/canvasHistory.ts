"use client";

import { Dispatch, SetStateAction, useCallback, useRef } from "react";
import { Point, Segment } from "../types";

type CanvasState = {
  lines: Segment[];
  pointMap: Array<[string, Point]>;
  freePoint: Point | null;
  savedStates: any[];
  locked: boolean;
  freedPoints: Point[];
  scale: number;
  position: { x: number; y: number };
  flashRed: boolean;
  hoveredLineIndex: number | null;
  validFlipPoints: Point[];
  pendingPoint: Point | { x: number; y: number } | null;
  isDragging: boolean;
  lastPointerPosition: { x: number; y: number } | null;
};

interface CanvasHistoryProps {
  lines: Segment[];
  pointMap: Map<string, Point>;
  freePoint: Point | null;
  savedStates: any[];
  locked: boolean;
  freedPoints: Point[];
  scale: number;
  position: { x: number; y: number };
  flashRed: boolean;
  hoveredLineIndex: number | null;
  validFlipPoints: Point[];
  pendingPoint: Point | { x: number; y: number } | null;
  isDragging: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  setLines: Dispatch<SetStateAction<Segment[]>>;
  setPointMap: Dispatch<SetStateAction<Map<string, Point>>>;
  setFreePoint: Dispatch<SetStateAction<Point | null>>;
  setSavedStates: Dispatch<SetStateAction<any[]>>;
  setLocked: Dispatch<SetStateAction<boolean>>;
  setFreedPoints: Dispatch<SetStateAction<Point[]>>;
  setScale: Dispatch<SetStateAction<number>>;
  setPosition: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setFlashRed: Dispatch<SetStateAction<boolean>>;
  setHoveredLineIndex: Dispatch<SetStateAction<number | null>>;
  setValidFlipPoints: Dispatch<SetStateAction<Point[]>>;
  setPendingPoint: Dispatch<SetStateAction<Point | { x: number; y: number } | null>>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  setLastPointerPosition: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
}

export const useCanvasHistory = ({
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
}: CanvasHistoryProps) => {
  const history = useRef<CanvasState[]>([]);
  const historyStep = useRef(0);

  const loadStateFromHistory = useCallback(
    (state: CanvasState) => {
      setLines(state.lines);
      setPointMap(new Map(state.pointMap));
      setFreePoint(state.freePoint);
      setSavedStates(state.savedStates);
      setLocked(state.locked);
      setFreedPoints(state.freedPoints);
      setScale(state.scale);
      setPosition(state.position);
      setFlashRed(state.flashRed);
      setHoveredLineIndex(state.hoveredLineIndex);
      setValidFlipPoints(state.validFlipPoints);
      setPendingPoint(state.pendingPoint);
      setIsDragging(state.isDragging);
      setLastPointerPosition(state.lastPointerPosition);
    },
    [
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
    ]
  );

  const handleUndo = useCallback(() => {
    if (historyStep.current === 0) {
      return;
    }

    historyStep.current -= 1;
    const previous = history.current[historyStep.current];
    if (previous) {
      loadStateFromHistory(previous);
    }
  }, [loadStateFromHistory]);

  const handleRedo = useCallback(() => {
    if (historyStep.current >= history.current.length - 1) {
      return;
    }

    historyStep.current += 1;
    const next = history.current[historyStep.current];
    if (next) {
      loadStateFromHistory(next);
    }
  }, [loadStateFromHistory]);

  const saveStateToHistory = useCallback(() => {
    const newState: CanvasState = {
      lines,
      pointMap: Array.from(pointMap.entries()),
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
    };

    history.current = history.current.slice(0, historyStep.current + 1);
    history.current = history.current.concat([newState]);
    historyStep.current += 1;

    if (history.current.length > 20) {
      history.current.shift();
      historyStep.current -= 1;
    }
  }, [
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
  ]);

  return {
    handleUndo,
    handleRedo,
    saveStateToHistory,
  };
};

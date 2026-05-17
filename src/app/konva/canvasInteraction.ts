"use client";

import { Dispatch, SetStateAction, useCallback, useEffect } from "react";
import { handleCanvasClickAction, handleFlipAction } from "./canvasMatching";
import { CanvasMatchingContext } from "./canvasMatching";

interface UseCanvasInteractionParams {
  locked: boolean;
  position: { x: number; y: number };
  scale: number;
  isDragging: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  setPosition: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setScale: Dispatch<SetStateAction<number>>;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  setLastPointerPosition: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
  setHoveredLineIndex: Dispatch<SetStateAction<number | null>>;
  matchingContext: CanvasMatchingContext;
  handleUndo: () => void;
  handleRedo: () => void;
}

export const useCanvasInteraction = ({
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
}: UseCanvasInteractionParams) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        handleUndo();
      } else if (e.ctrlKey && e.key === "Z" && e.shiftKey) {
        handleRedo();
      }
    },
    [handleUndo, handleRedo]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleMouseDown = useCallback(
    (e: any) => {
      const buttonCode = e.evt.button;

      if (buttonCode === 1) {
        e.evt.preventDefault();
        setIsDragging(true);

        const stage = e.target.getStage();
        const pointerPos = stage.getPointerPosition();
        setLastPointerPosition(pointerPos);
        return;
      }

      if (buttonCode === 0) {
        if (locked) {
          handleFlipAction(matchingContext, e);
        } else {
          handleCanvasClickAction(matchingContext, e);
        }
      }
    },
    [locked, matchingContext, setIsDragging, setLastPointerPosition]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isDragging || !lastPointerPosition) return;

      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();

      const dx = pointerPos.x - lastPointerPosition.x;
      const dy = pointerPos.y - lastPointerPosition.y;

      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setLastPointerPosition(pointerPos);
    },
    [isDragging, lastPointerPosition, setPosition, setLastPointerPosition]
  );

  const handleMouseUp = useCallback(
    (e: any) => {
      if (e.evt.button === 1) {
        setIsDragging(false);
        setLastPointerPosition(null);
      }
    },
    [setIsDragging, setLastPointerPosition]
  );

  const handleMouseOut = useCallback(() => {
    setIsDragging(false);
    setLastPointerPosition(null);
  }, [setIsDragging, setLastPointerPosition]);

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      const oldScale = scale;
      const pointer = stage.getPointerPosition();

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
      const limitedScale = Math.min(Math.max(newScale, 0.3), 5);

      const newPos = {
        x: pointer.x - mousePointTo.x * limitedScale,
        y: pointer.y - mousePointTo.y * limitedScale,
      };

      setScale(limitedScale);
      setPosition(newPos);
    },
    [position, scale, setPosition, setScale]
  );

  const handleLineHover = useCallback(
    (index: number) => {
      if (locked) {
        setHoveredLineIndex(index);
      }
    },
    [locked, setHoveredLineIndex]
  );

  const handleLineLeave = useCallback(() => {
    setHoveredLineIndex(null);
  }, [setHoveredLineIndex]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
    handleWheel,
    handleLineHover,
    handleLineLeave,
  };
};

import React, { useCallback } from "react";
import ActionButton from "./components/ActionButton";
import toast from "react-hot-toast";
import { KonvaCanvasRef } from "./KonvaCanvas";

interface CanvasButtonsProps {
  canvasRef: React.RefObject<KonvaCanvasRef>;
  updateStatistics: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  setScale: (callback: (prevScale: number) => number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  saveState: () => void;
}

const CanvasButtons: React.FC<CanvasButtonsProps> = ({
  canvasRef,
  updateStatistics,
  handleUndo,
  handleRedo,
  setScale,
  setPosition,
  saveState,
}) => {
  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      updateStatistics();
    }
    toast.success("Canvas cleared");
  }, [canvasRef, updateStatistics]);

  const handleLoadCanonical = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.makeCanonical();
      updateStatistics();
    }
  }, [canvasRef, updateStatistics]);

  const handleEdit = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.edit();
      updateStatistics();
    }
  }, [canvasRef, updateStatistics]);

  const handleGenerateAllMatchings = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.generateAllMatchings();
    }
  }, [canvasRef]);

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {/* Undo and Redo */}
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleUndo}
        tooltip="Undo the last action (or use Ctrl+Z)"
      >
        Undo
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleRedo}
        tooltip="Redo the last undone action (or use Ctrl+Shift+Z)"
      >
        Redo
      </ActionButton>

      <div className="border-l border-gray-300 h-6 self-center"></div>

      {/* Zoom Controls */}
      <ActionButton
        variant="outline"
        size="sm"
        onClick={() => setScale((prev) => Math.max(prev / 1.2, 0.3))}
        tooltip="Zoom out the canvas (or use mouse wheel down on canvas)"
      >
        Zoom Out
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={() => {
            setScale(() => 1);
          setPosition({ x: 0, y: 0 });
        }}
        tooltip="Reset canvas to default position and zoom level (Pro tip: Pan by holding middle mouse button)"
      >
        Reset View
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={() => setScale((prev) => Math.min(prev * 1.2, 5))}
        tooltip="Zoom in the canvas (or use mouse wheel up on canvas)"
      >
        Zoom In
      </ActionButton>

      <div className="border-l border-gray-300 h-6 self-center"></div>

      {/* Add Matching */}
      <ActionButton
        variant="outline"
        size="sm"
        onClick={saveState}
        tooltip="Save the current matching state"
      >
        Add Matching
      </ActionButton>

      <div className="border-l border-gray-300 h-6 self-center"></div>

      {/* Existing Functionality */}
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleClear}
        tooltip="Clear the canvas"
      >
        Clear
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleLoadCanonical}
        tooltip="Load Canonical"
      >
        Load Canonical
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleEdit}
        tooltip="Edit the canvas"
      >
        Edit
      </ActionButton>
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleGenerateAllMatchings}
        tooltip="Generate all matchings"
      >
        Generate Matchings
      </ActionButton>
    </div>
  );
};

export default CanvasButtons;
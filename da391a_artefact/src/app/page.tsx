"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import toast, { Toaster } from 'react-hot-toast';
import Header from "./components/Header";
import Sidebar from "./components/SideBar";
import { KonvaCanvasRef } from "./KonvaCanvas"; // Import the ref type

// Use dynamic import with ssr: false
const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), { ssr: false });

export default function Home() {
  // Define state for mode
  const [mode, setMode] = useState<'manual' | 'auto' | 'target'>('manual');
  
  // Define state for history (for undo functionality)
  const [history, setHistory] = useState<any[]>([{}]);
  
  // Create a ref for the KonvaCanvas
  const canvasRef = useRef<KonvaCanvasRef>(null);
  
  // State for sidebar statistics
  const [pointCount, setPointCount] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [avgDistance, setAvgDistance] = useState(0);
  const [freePointCoords, setFreePointCoords] = useState<{ x: number, y: number } | null>(null);
  const [savedStates, setSavedStates] = useState<any[]>([]);
  
  // Update statistics from canvas data
  const updateStatistics = useCallback(() => {
    if (!canvasRef.current) return;
    
    const points = canvasRef.current.getPoints();
    const lines = canvasRef.current.getLines();
    const freePoint = canvasRef.current.getFreePoint();
    const states = canvasRef.current.getSavedStates();
  
    setPointCount(points.length);
    setSegmentCount(lines.length);
    setFreePointCoords(freePoint ? {
      x: freePoint.x / 50,
      y: freePoint.y / 50

    } : null);
    setSavedStates(states);
    
    // Calculate average distance
    if (lines.length > 0) {
      const totalDistance = lines.reduce((acc, line) => {
        const dx = line.start.x - line.end.x;
        const dy = line.start.y - line.end.y;
        return acc + Math.sqrt(dx * dx + dy * dy);
      }, 0);
      
      setAvgDistance(totalDistance / lines.length / 50);
    } else {
      setAvgDistance(0);
    }
  }, []);
  
  // Set up interval to update statistics
  useEffect(() => {
    const interval = setInterval(updateStatistics, 500);
    return () => clearInterval(interval);
  }, [updateStatistics]);
  
  // Define handlers for the Header component
  const handleModeChange = useCallback((newMode: 'manual' | 'auto' | 'target') => {
    setMode(newMode);
  }, []);
  
  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      updateStatistics();
    }
    
    // Add current state to history
    setHistory(prev => [...prev, {}]);
    console.log("Clear canvas");
    toast.success("Canvas cleared");
  }, [updateStatistics]);
  
  const handleUndo = useCallback(() => {
    if (history.length > 1) {
      // Remove the last item from history
      setHistory(prev => prev.slice(0, -1));
      console.log("Undo last action");
    }
  }, [history]);
  
  const handleSave = useCallback(() => {
    console.log("Save canvas");
    toast.success("Canvas saved");
  }, []);
  
  const handleLoadCanonical = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.makeCanonical();
      updateStatistics();
    }
    console.log("Load canonical");
  }, [updateStatistics]);
  
  // Define handlers for the Sidebar component
  const handleRandomGenerate = useCallback((numPoints: number) => {
    if (canvasRef.current) {
      canvasRef.current.generateRandomPoints(numPoints);
      updateStatistics();
    }
    
    console.log(`Generate random matching with ${numPoints} points`);
    
    // Add to history
    setHistory(prev => [...prev, { numPoints }]);
    toast.success(`Generated random matching with ${numPoints} points`);
  }, [updateStatistics]);

  const handleClearHistory = useCallback(() => {
    
    if (canvasRef.current) {
      canvasRef.current.clearSavedStates(); // Clear states in the canvas component
      updateStatistics(); // Update the UI
    }

    setHistory([{}]);
    toast.success("History cleared");

  }, [updateStatistics]);
  
  const handleHistorySelect = useCallback((historyIndex: number) => {
    if (canvasRef.current) {
      canvasRef.current.loadState(historyIndex);
      
      
      setTimeout(() => {
        updateStatistics();
      }, 50);
    }
    
    console.log(`Loaded history at index ${historyIndex}`);
    toast.success(`Loaded history at index ${historyIndex}`);
  }, [updateStatistics]);

  return (
    <div className="bg-white text-black p-4 w-full flex flex-col h-screen">
      <Toaster position="bottom-left" />
      <Header
        activeMode={mode}
        onModeChange={handleModeChange}
        onClear={handleClear}
        onUndo={handleUndo}
        onSave={handleSave}
        onLoadCanonical={handleLoadCanonical}
        canUndo={history.length > 1}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <KonvaCanvas ref={canvasRef} />
        </div>
        <div className="w-64">
          <Sidebar
            mode={mode}
            onRandomGenerate={handleRandomGenerate}
            onHistorySelect={handleHistorySelect}
            onClearHistory={handleClearHistory} // Pass the clear function
            pointCount={pointCount}
            segmentCount={segmentCount}
            avgDistance={avgDistance}
            freePointCoords={freePointCoords}
            savedStates={savedStates}
          />
        </div>
      </div>
    </div>
  );
}
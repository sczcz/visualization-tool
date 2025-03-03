"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "./components/Header";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), { ssr: false });

export default function Home() {
  // Define state for mode
  const [mode, setMode] = useState<'manual' | 'auto' | 'target'>('manual');
  
  // Define state for history (for undo functionality)
  const [history, setHistory] = useState<any[]>([{}]);
  
  // Define handlers for the Header component
  const handleModeChange = useCallback((newMode: 'manual' | 'auto' | 'target') => {
    setMode(newMode);
  }, []);
  
  const handleClear = useCallback(() => {
    // Add current state to history before clearing
    setHistory(prev => [...prev, {}]);
    // Implement your clear logic here
    console.log("Clear canvas");
  }, []);
  
  const handleUndo = useCallback(() => {
    if (history.length > 1) {
      // Remove the last item from history
      setHistory(prev => prev.slice(0, -1));
      // Implement your undo logic here
      console.log("Undo last action");
    }
  }, [history]);
  
  const handleSave = useCallback(() => {
    // Implement your save logic here
    console.log("Save canvas");
  }, []);
  
  const handleLoadCanonical = useCallback(() => {
    // Implement your load canonical logic here
    console.log("Load canonical");
  }, []);

  return (
    <div className="bg-white text-black p-4 w-full">
      <Header
        activeMode={mode}
        onModeChange={handleModeChange}
        onClear={handleClear}
        onUndo={handleUndo}
        onSave={handleSave}
        onLoadCanonical={handleLoadCanonical}
        canUndo={history.length > 1}
      />
      <h1>Artefact draft</h1>
      <KonvaCanvas />
    </div>
  );
}
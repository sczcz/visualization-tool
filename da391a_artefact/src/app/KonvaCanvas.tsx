"use client";

import React from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { snapToGrid, doesIntersect } from "./utils/MathUtils";
import { wouldCreateCollinearity, wouldCrossExistingSegments } from "./utils/CanvasUtils";

const GRID_SIZE = 50;

// Define the ref interface
export interface KonvaCanvasRef {
  getPoints: () => { x: number; y: number }[];
  getLines: () => { start: { x: number; y: number }; end: { x: number; y: number } }[];
  getFreePoint: () => { x: number; y: number } | null;
  getSavedStates: () => any[];
  clearCanvas: () => void;
  generateRandomPoints: (numPoints: number) => void;
  loadState: (stateIndex: number) => void;
}

const KonvaCanvas = forwardRef<KonvaCanvasRef, {}>((props, ref) => {
  const [points, setPoints] = useState(new Set<string>());
  const [lines, setLines] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);
  const [freePoint, setFreePoint] = useState<{ x: number; y: number } | null>(null);
  const [savedStates, setSavedStates] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [freedPoints, setFreedPoints] = useState<{ x: number; y: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flashRed, setFlashRed] = useState(false);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [validFlipPoints, setValidFlipPoints] = useState<{ x: number; y: number }[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);

  // Expose methods and data to parent component via ref
  useImperativeHandle(ref, () => ({
    getPoints: () =>
      Array.from(points).map(str => {
        const [x, y] = str.split(",").map(Number);
        return { x, y };
      }),
    getLines: () => lines,
    getFreePoint: () => freePoint,
    getSavedStates: () => savedStates,
    clearCanvas: () => {
      setPoints(new Set());
      setLines([]);
      setFreePoint(null);
      setLocked(false);
      setFreedPoints([]);
      setError(null);
      setFlashRed(false);
      setValidFlipPoints([]);
      setPendingPoint(null);
    },
    generateRandomPoints: (numPoints: number) => {
      // Clear everything
      setPoints(new Set());
      setLines([]);
      setFreePoint(null);
      setLocked(false);
      setFreedPoints([]);
      setError(null);
      setValidFlipPoints([]);
      setPendingPoint(null);
    
      const gridWidth = Math.floor(800 / GRID_SIZE);
      const gridHeight = Math.floor(600 / GRID_SIZE);
      const newPoints = new Set<string>();
    
      const maxAttempts = 20000;
      let totalAttempts = 0;
      let backtrackStack: string[] = [];
    
      const shuffledGrid: { x: number; y: number }[] = [];
      for (let i = 1; i < gridWidth - 1; i++) {
        for (let j = 1; j < gridHeight - 1; j++) {
          shuffledGrid.push({ x: i * GRID_SIZE, y: j * GRID_SIZE });
        }
      }
      shuffledGrid.sort(() => Math.random() - 0.5);
    
      if (numPoints > shuffledGrid.length) {
        setError("Too many points requested for the grid size!");
        return;
      }
    
      // Helper function to check if a new point is valid
      const isValidPoint = (x: number, y: number, pointsArray: { x: number; y: number }[]) => {
        const pointKey = `${x},${y}`;
        if (newPoints.has(pointKey)) return false; // Avoid duplicates
    
        // Check collinearity only against the last few points to reduce complexity
        if (pointsArray.length >= 2 && wouldCreateCollinearity({ x, y }, newPoints)) {
          return false;
        }
    
        // Check segment crossing only if the number of points is odd
        if (pointsArray.length % 2 === 1) {
          const previousPoint = pointsArray[pointsArray.length - 1];
          const existingLines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
          for (let i = 0; i < pointsArray.length - 1; i += 2) {
            existingLines.push({
              start: pointsArray[i],
              end: pointsArray[i + 1],
            });
          }
    
          if (wouldCrossExistingSegments(previousPoint, { x, y }, existingLines)) {
            return false;
          }
        }
    
        return true;
      };
    
      // Attempt to place points
      while (newPoints.size < numPoints && totalAttempts < maxAttempts) {
        totalAttempts++;
    
        let x, y;
        if (shuffledGrid.length > 0) {
          // Pick from shuffled grid for initial points
          const point = shuffledGrid.pop();
          if (!point) continue;
          x = point.x;
          y = point.y;
        } else {
          // Switch to random placement if shuffled grid is exhausted
          x = Math.floor(Math.random() * (gridWidth - 1) + 1) * GRID_SIZE;
          y = Math.floor(Math.random() * (gridHeight - 1) + 1) * GRID_SIZE;
        }
    
        const pointsArray = Array.from(newPoints, str => {
          const [px, py] = str.split(",").map(Number);
          return { x: px, y: py };
        });
    
        if (!isValidPoint(x, y, pointsArray)) continue;
    
        // Add the point
        const pointKey = `${x},${y}`;
        newPoints.add(pointKey);
        backtrackStack.push(pointKey); // Store for backtracking
    
        // Backtracking step: Remove points if we're stuck
        if (newPoints.size > numPoints - 4 && totalAttempts > maxAttempts * 0.8) {
          // Remove up to 2 points to allow more flexibility
          for (let i = 0; i < 2; i++) {
            if (backtrackStack.length > 0) {
              const removedPoint = backtrackStack.pop();
              if (removedPoint) newPoints.delete(removedPoint);
            }
          }
        }
      }
    
      // Final conversion
      const finalPointsArray = Array.from(newPoints, str => {
        const [px, py] = str.split(",").map(Number);
        return { x: px, y: py };
      });
    
      setPoints(newPoints);
    
      if (finalPointsArray.length % 2 === 1 && finalPointsArray.length > 0) {
        setFreePoint(finalPointsArray[finalPointsArray.length - 1]);
      }
    
      const newLines = [];
      for (let i = 0; i < Math.floor(finalPointsArray.length / 2); i++) {
        newLines.push({
          start: finalPointsArray[i * 2],
          end: finalPointsArray[i * 2 + 1],
        });
      }
    
      setLines(newLines);
    },
    loadState: (stateIndex: number) => {
      if (stateIndex >= 0 && stateIndex < savedStates.length) {
        const state = savedStates[stateIndex];
        
        // Clear current canvas
        setPoints(new Set());
        setLines([]);
        setFreePoint(null);
        setLocked(false);
        setFreedPoints([]);
        setError(null);
        setFlashRed(false);
        setValidFlipPoints([]);
        setPendingPoint(null);
        
        // Convert the saved state coordinates back to canvas coordinates
        const GRID_ROWS = 600 / GRID_SIZE;
        
        // Create points from the lines in the saved state
        const newPoints = new Set<string>();
        const newLines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
        
        state.lines.forEach((line: any) => {
          // Convert from grid coordinates back to canvas coordinates
          const startPoint = {
            x: line.start.x * GRID_SIZE,
            y: (GRID_ROWS - line.start.y) * GRID_SIZE
          };
          
          const endPoint = {
            x: line.end.x * GRID_SIZE,
            y: (GRID_ROWS - line.end.y) * GRID_SIZE
          };
          
          // Add points if they don't already exist
          const startKey = `${startPoint.x},${startPoint.y}`;
          const endKey = `${endPoint.x},${endPoint.y}`;
          
          if (!newPoints.has(startKey)) newPoints.add(startKey);
          if (!newPoints.has(endKey)) newPoints.add(endKey);          
          
          // Add the line
          newLines.push({
            start: startPoint,
            end: endPoint
          });
        });
        
        // Add the free point if it exists
        if (state.freePoint) {
          const freePointCanvas = {
            x: state.freePoint.x * GRID_SIZE,
            y: (GRID_ROWS - state.freePoint.y) * GRID_SIZE
          };
          
          const freePointKey = `${freePointCanvas.x},${freePointCanvas.y}`;
          if (!newPoints.has(freePointKey)) {
            newPoints.add(freePointKey);
          }
          setFreePoint(freePointCanvas);
        }
        
        // Set the state
        setPoints(new Set(newPoints));
        setLines(newLines);
        setLocked(true); // Set to locked state since we're loading a saved configuration
        
        console.log(`Loaded state ${stateIndex + 1}`);
      }
    }
  }));

  const handleCanvasClick = (e: any) => {
    if (locked) return;
  
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
  
    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y, GRID_SIZE);
    const pointKey = `${snappedPos.x},${snappedPos.y}`;
  
    if (points.has(pointKey)) {
      setError("Point already exists!");
      setFlashRed(true);
      setTimeout(() => {
        setError(null);
        setFlashRed(false);
      }, 1500);
      return;
    }
  
    if (wouldCreateCollinearity(snappedPos, points)) {
      setError("Cannot place collinear points!");
      setFlashRed(true);
      setTimeout(() => {
        setError(null);
        setFlashRed(false);
      }, 1500);
      return;
    }
  
    if (pendingPoint) {
      const newSegment = { start: pendingPoint, end: snappedPos };
  
      if (wouldCrossExistingSegments(pendingPoint, snappedPos, lines)) {
        setError("DO NOT CROSS LINES!!!");
        setFlashRed(true);
        setTimeout(() => {
          setError(null);
          setFlashRed(false);
        }, 1500);
        return;
      }
  
      setPoints(prevPoints => {
        const newSet = new Set(prevPoints);
        newSet.add(pointKey);
  
        setFreePoint(newSet.size % 2 === 1 ? snappedPos : null);
        return newSet;
      });
  
      setLines(prevLines => [...prevLines, newSegment]);
      setPendingPoint(null);
    } else {
      setPoints(prevPoints => {
        const newSet = new Set(prevPoints);
        newSet.add(pointKey);
  
        setFreePoint(newSet.size % 2 === 1 ? snappedPos : null);
        return newSet;
      });
  
      setPendingPoint(snappedPos);
    }
  };
  

  const saveState = () => {
    if (lines.length === 0 || freePoint === null) {
      setError("CANNOT SAVE! NO VALID CONFIG!!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    const GRID_ROWS = 600 / GRID_SIZE;
    
    const uniqueLines = Array.from(
      new Map(
        lines.map(line => [
          JSON.stringify({
            start: { x: line.start.x, y: line.start.y },
            end: { x: line.end.x, y: line.end.y },
          }),
          line,
        ])
      ).values()
    );

    const newState = {
      segmentCount: uniqueLines.length * 2,
      lines: uniqueLines.map(({ start, end }) => ({
        start: { x: start.x / GRID_SIZE, y: GRID_ROWS - start.y / GRID_SIZE },
        end: { x: end.x / GRID_SIZE, y: GRID_ROWS - end.y / GRID_SIZE },
      })),
      freePoint: { x: freePoint.x / GRID_SIZE, y: GRID_ROWS - freePoint.y / GRID_SIZE },
    };

    console.log("🔹 Saved Matching", savedStates.length + 1);
    console.table(newState.lines);
    
    setSavedStates((prevStates) => [...prevStates, newState]);
    setLocked(true);
  };

  // Check if a potential flip would be valid
  const isValidFlip = (freedPoint: { x: number; y: number }, currentFreePoint: { x: number; y: number } | null) => {
    if (!currentFreePoint) return false;
    
    // Create the potential new segment
    const newSegment = {
      start: freedPoint,
      end: currentFreePoint
    };
    
    // Filter out any lines that contain the freed points (since they'll be removed)
    const otherLines = lines.filter(line => 
      !freedPoints.some(fp => 
        (line.start.x === fp.x && line.start.y === fp.y) || 
        (line.end.x === fp.x && line.end.y === fp.y)
      )
    );
    
    // Check if the potential new segment would intersect with any existing lines
    return !otherLines.some(line => doesIntersect(line, newSegment));
  };

  const handleLineClick = (index: number) => {
    if (!locked || freedPoints.length > 0) return;

    const removedLine = lines[index];
    
    // Check which flips would be valid
    const validPoints: { x: number; y: number }[] = [];
    
    // Check if connecting start point to free point would be valid
    if (freePoint && isValidFlip(removedLine.start, freePoint)) {
      validPoints.push(removedLine.start);
    }
    
    // Check if connecting end point to free point would be valid
    if (freePoint && isValidFlip(removedLine.end, freePoint)) {
      validPoints.push(removedLine.end);
    }
    
    if (validPoints.length === 0) {
      setError("Cannot remove this line - no valid flip possible!");
      setFlashRed(true);
      setTimeout(() => {
        setError(null);
        setFlashRed(false);
      }, 1500);
      return;
    }
    
    // If we get here, at least one valid flip is possible
    // Create a new array without the removed line
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
    setFreedPoints([removedLine.start, removedLine.end]);
    setValidFlipPoints(validPoints);
    setError(null);
    
    console.log(`Removed line at index ${index}, freed points:`, removedLine.start, removedLine.end);
    console.log(`Valid flip points:`, validPoints);
  };

  const handleLineHover = (index: number) => {
    if (locked) {
      setHoveredLineIndex(index);
    }
  };

  const handleLineLeave = () => {
    setHoveredLineIndex(null);
  };

  const handleFlip = (e: any) => {
    if (!locked || freedPoints.length !== 2 || !freePoint) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y, GRID_SIZE);

    // Check if the clicked point is one of the freed points
    const isFreedPoint = freedPoints.some(p => p.x === snappedPos.x && p.y === snappedPos.y);
    
    if (!isFreedPoint) {
      setError("You must click on one of the highlighted points to connect it to the free point!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    // Check if this is a valid flip point
    const isValidFlipPoint = validFlipPoints.some(p => p.x === snappedPos.x && p.y === snappedPos.y);
    
    if (!isValidFlipPoint) {
      setError("This connection would cross other lines!");
      setTimeout(() => setError(null), 1500);
      return;
    }

    const newSegment = { start: snappedPos, end: freePoint };
    
    // The new free point is the other freed point
    const newFreePoint = freedPoints.find(p => p.x !== snappedPos.x || p.y !== snappedPos.y);
    
    if (!newFreePoint) {
      console.error("Could not find the other freed point");
      return;
    }

    // Add the new line
    setLines(prevLines => [...prevLines, newSegment]);
    setFreedPoints([]);
    setFreePoint(newFreePoint);
    setValidFlipPoints([]);
    
    console.log(`Added new line from (${snappedPos.x}, ${snappedPos.y}) to (${freePoint.x}, ${freePoint.y})`);
    console.log(`New free point: (${newFreePoint.x}, ${newFreePoint.y})`);
  };
  

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <button onClick={saveState} style={{ marginBottom: "10px", padding: "8px", cursor: "pointer" }}>
        Save Configuration
      </button>

      <div
        style={{
          display: "inline-block",
          border: flashRed ? "4px solid red" : "2px solid black",
          transition: "border 0.3s ease",
        }}
      >
        <Stage width={800} height={600} onClick={locked ? handleFlip : handleCanvasClick} style={{ backgroundColor: "#f9f9f9" }}>
          <Layer>
            {/* Grid lines */}
            {[...Array(800 / GRID_SIZE)].map((_, i) => (
              <Line key={`grid-v-${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, 600]} stroke="#ddd" />
            ))}
            {[...Array(600 / GRID_SIZE)].map((_, i) => (
              <Line key={`grid-h-${i}`} points={[0, i * GRID_SIZE, 800, i * GRID_SIZE]} stroke="#ddd" />
            ))}

            {/* Render lines with both visible thin line and invisible thick hitbox */}
            {lines.map((line, i) => (
              <React.Fragment key={`line-${i}`}>
                {/* Invisible thick line for better hit detection */}
                <Line 
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]} 
                  stroke="rgba(0,0,0,0)" 
                  strokeWidth={15} 
                  onClick={() => handleLineClick(i)}
                  onMouseEnter={() => handleLineHover(i)}
                  onMouseLeave={handleLineLeave}
                />
                {/* Visible thin line */}
                <Line 
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]} 
                  stroke={hoveredLineIndex === i && locked ? "#ff6b6b" : "black"} 
                  strokeWidth={hoveredLineIndex === i && locked ? 3 : 2} 
                  listening={false} // This line doesn't handle events
                />
              </React.Fragment>
            ))}

            {/* Render points */}
            {Array.from(points).map((pointString, i) => {
              const [x, y] = pointString.split(",").map(Number);
              return <Circle key={`point-${i}`} x={x} y={y} radius={5} fill="blue" />;
            })}

            {/* Render free point */}
            {freePoint && <Circle x={freePoint.x} y={freePoint.y} radius={7} fill="red" />}
            
            {/* Highlight pending point */}
            {pendingPoint && <Circle x={pendingPoint.x} y={pendingPoint.y} radius={6} fill="purple" stroke="black" strokeWidth={1} />}
            
            {/* Highlight freed points with different colors based on validity */}
            {freedPoints.map((p, i) => {
              const isValidFlip = validFlipPoints.some(vp => vp.x === p.x && vp.y === p.y);
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
          </Layer>
        </Stage>
      </div>

      <div style={{ marginTop: "20px" }}>
        {error && (
          <div style={{ color: "red", fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';

export default KonvaCanvas;
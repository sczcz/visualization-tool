"use client";

import React from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";

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
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
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
    getPoints: () => points,
    getLines: () => lines,
    getFreePoint: () => freePoint,
    getSavedStates: () => savedStates,
    clearCanvas: () => {
      setPoints([]);
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
      // Clear existing points and lines
      setPoints([]);
      setLines([]);
      setFreePoint(null);
      setLocked(false);
      setFreedPoints([]);
      setError(null);
      setValidFlipPoints([]);
      setPendingPoint(null);
      
      // Implementation for random point generation with no crossing segments and no collinear points
      const gridWidth = Math.floor(800 / GRID_SIZE);
      const gridHeight = Math.floor(600 / GRID_SIZE);
      const newPoints: { x: number; y: number }[] = [];
      
      // Improved helper function to check if three points are collinear
      const areCollinear = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
        // Calculate the area of the triangle formed by the three points
        // If area is zero, points are collinear
        const area = Math.abs(
          (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
        );
        
        // Use a more strict epsilon for better collinearity detection
        return Math.abs(area) < 0.0001;
      };
      
      // Helper function to check if a new point would create collinearity with ANY existing points
      const wouldCreateCollinearity = (newPoint: { x: number; y: number }) => {
        // Need at least 2 existing points to check for collinearity
        if (newPoints.length < 2) return false;
        
        // Check all possible triplets of points (two existing points + the new point)
        for (let i = 0; i < newPoints.length; i++) {
          for (let j = i + 1; j < newPoints.length; j++) {
            if (areCollinear(newPoints[i], newPoints[j], newPoint)) {
              return true;
            }
          }
        }
        return false;
      };
      
      // Helper function to check if a new segment would cross any existing segments
      const wouldCrossExistingSegments = (start: { x: number; y: number }, end: { x: number; y: number }, existingLines: any[]) => {
        const newSegment = { start, end };
        return existingLines.some(line => doesIntersect(line, newSegment));
      };
      
      // Generate points one by one
      const maxAttempts = 2000; // Increased to allow more attempts for finding valid points
      let attempts = 0;
      let totalAttempts = 0;
      
      while (newPoints.length < numPoints && totalAttempts < maxAttempts * numPoints) {
        totalAttempts++;
        attempts++;
        
        // Generate a random point on the grid
        const x = Math.floor(Math.random() * (gridWidth - 1) + 1) * GRID_SIZE;
        const y = Math.floor(Math.random() * (gridHeight - 1) + 1) * GRID_SIZE;
        const newPoint = { x, y };
        
        // Check if this point already exists
        const pointExists = newPoints.some(p => p.x === x && p.y === y);
        if (pointExists) continue;
        
        // Check if this point would create collinearity with ANY existing points
        if (wouldCreateCollinearity(newPoint)) continue;
        
        // If we're adding an even-indexed point (other than the first point),
        // we need to check if the segment it forms would cross any existing segments
        if (newPoints.length > 0 && newPoints.length % 2 === 1) {
          const previousPoint = newPoints[newPoints.length - 1];
          const existingLines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
          
          // Create existing lines from pairs of points
          for (let i = 0; i < Math.floor((newPoints.length - 1) / 2); i++) {
            existingLines.push({
              start: newPoints[i * 2],
              end: newPoints[i * 2 + 1]
            });
          }
          
          if (wouldCrossExistingSegments(previousPoint, newPoint, existingLines)) {
            continue;
          }
        }
        
        // If we reach here, the point is valid
        newPoints.push(newPoint);
        attempts = 0; // Reset attempts counter after successful addition
      }
      
      // If we couldn't generate enough points, try with fewer points
      if (newPoints.length < numPoints) {
        console.warn(`Could only generate ${newPoints.length} points without collinearity or crossing segments`);
      }
      
      setPoints(newPoints);
      
      // If odd number of points, set the last one as free point
      if (newPoints.length % 2 === 1 && newPoints.length > 0) {
        setFreePoint(newPoints[newPoints.length - 1]);
      }
      
      // Create lines for pairs of points
      const newLines = [];
      for (let i = 0; i < Math.floor(newPoints.length / 2); i++) {
        newLines.push({
          start: newPoints[i * 2],
          end: newPoints[i * 2 + 1]
        });
      }
      
      setLines(newLines);
    },
    loadState: (stateIndex: number) => {
      if (stateIndex >= 0 && stateIndex < savedStates.length) {
        const state = savedStates[stateIndex];
        
        // Clear current canvas
        setPoints([]);
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
        const newPoints: { x: number; y: number }[] = [];
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
          if (!newPoints.some(p => p.x === startPoint.x && p.y === startPoint.y)) {
            newPoints.push(startPoint);
          }
          
          if (!newPoints.some(p => p.x === endPoint.x && p.y === endPoint.y)) {
            newPoints.push(endPoint);
          }
          
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
          
          if (!newPoints.some(p => p.x === freePointCanvas.x && p.y === freePointCanvas.y)) {
            newPoints.push(freePointCanvas);
          }
          
          setFreePoint(freePointCanvas);
        }
        
        // Set the state
        setPoints(newPoints);
        setLines(newLines);
        setLocked(true); // Set to locked state since we're loading a saved configuration
        
        console.log(`Loaded state ${stateIndex + 1}`);
      }
    }
  }));

  const snapToGrid = (x: number, y: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  const doesIntersect = (line1: any, line2: any) => {
    const { start: A, end: B } = line1;
    const { start: C, end: D } = line2;
  
    // Check if the lines share an endpoint
    if ((A.x === C.x && A.y === C.y) || 
        (A.x === D.x && A.y === D.y) || 
        (B.x === C.x && B.y === C.y) || 
        (B.x === D.x && B.y === D.y)) {
      return false; // Lines that share an endpoint don't "intersect"
    }
    
    const orientation = (p: any, q: any, r: any) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0; 
      return val > 0 ? 1 : 2;
    };
  
    const o1 = orientation(A, B, C);
    const o2 = orientation(A, B, D);
    const o3 = orientation(C, D, A);
    const o4 = orientation(C, D, B);
  
    if (o1 !== o2 && o3 !== o4) return true;
  
    return false;
  };

  // Helper function to check if three points are collinear
  const areCollinear = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
    // Calculate the area of the triangle formed by the three points
    // If area is zero, points are collinear
    const area = Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
    );
    return Math.abs(area) < 0.0001; // Using a small epsilon for floating point comparison
  };

  // Check if adding a new point would create collinearity with any existing points
  const wouldCreateCollinearity = (newPoint: { x: number; y: number }, existingPoints: { x: number; y: number }[]) => {
    if (existingPoints.length < 2) return false;
    
    for (let i = 0; i < existingPoints.length; i++) {
      for (let j = i + 1; j < existingPoints.length; j++) {
        if (areCollinear(existingPoints[i], existingPoints[j], newPoint)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleCanvasClick = (e: any) => {
    if (locked) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
  
    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y);
    
    // Check if this point already exists
    const pointExists = points.some(p => p.x === snappedPos.x && p.y === snappedPos.y);
    if (pointExists) {
      setError("Point already exists!");
      setFlashRed(true);
      setTimeout(() => {
        setError(null);
        setFlashRed(false);
      }, 1500);
      return;
    }
    
    // Check for collinearity with existing points
    if (wouldCreateCollinearity(snappedPos, points)) {
      setError("Cannot place collinear points!");
      setFlashRed(true);
      setTimeout(() => {
        setError(null);
        setFlashRed(false);
      }, 1500);
      return;
    }
  
    // If we have a pending point, create a segment
    if (pendingPoint) {
      const newSegment = {
        start: pendingPoint,
        end: snappedPos
      };
      
      // Check for intersections with existing lines
      const hasIntersection = lines.some((existingLine) => doesIntersect(existingLine, newSegment));
      
      if (hasIntersection) {
        setError("DO NOT CROSS LINES!!!");
        setFlashRed(true);
        setTimeout(() => {
          setError(null);
          setFlashRed(false);
        }, 1500);
        return;
      }
      
      // Add the new point and segment
      setPoints(prevPoints => [...prevPoints, snappedPos]);
      setLines(prevLines => [...prevLines, newSegment]);
      setPendingPoint(null);
      
      // If we have an odd number of points, set the last one as free point
      if ((points.length + 1) % 2 === 1) {
        setFreePoint(snappedPos);
      } else {
        setFreePoint(null);
      }
    } else {
      // This is the first point of a potential segment
      setPoints(prevPoints => [...prevPoints, snappedPos]);
      setPendingPoint(snappedPos);
      
      // If we have an odd number of points, set the last one as free point
      if ((points.length + 1) % 2 === 1) {
        setFreePoint(snappedPos);
      } else {
        setFreePoint(null);
      }
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

    const snappedPos = snapToGrid(pointerPos.x, pointerPos.y);

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
            {points.map((p, i) => (
              <Circle key={`point-${i}`} x={p.x} y={p.y} radius={5} fill="blue" />
            ))}

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
import React, { useState } from 'react';
import ActionButton from './ActionButton';

interface SidebarProps {
  className?: string;
  mode: 'manual' | 'auto' | 'target';
  onRandomGenerate: (numPoints: number) => void;
  onHistorySelect: (index: number) => void;
  // Add statistics props
  pointCount: number;
  segmentCount: number;
  avgDistance: number;
  freePointCoords: { x: number, y: number } | null;
  savedStates: any[];
}

const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  mode,
  onRandomGenerate,
  onHistorySelect,
  pointCount = 0,
  segmentCount = 0,
  avgDistance = 0,
  freePointCoords = null,
  savedStates = []
}) => {
  const [numPoints, setNumPoints] = useState<number>(5);
  
  // Combine classes manually
  const sidebarClasses = ["p-4 h-full overflow-auto border-l", className].filter(Boolean).join(' ');

  return (
    <div className={sidebarClasses}>
      {mode === 'auto' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Auto Generation</h3>
          <div className="flex items-center mb-2">
            <label className="text-sm mr-2">Number of Points:</label>
            <input
              type="number"
              min={3}
              max={21}
              step={2}
              value={numPoints}
              onChange={(e) => setNumPoints(parseInt(e.target.value) || 3)}
              className="w-16 px-2 py-1 rounded border"
            />
          </div>
          <ActionButton
            onClick={() => onRandomGenerate(numPoints)}
            className="w-full"
          >
            Generate Random
          </ActionButton>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Matching Statistics</h3>
        <div className="bg-gray-100 p-3 rounded">
          <div className="flex justify-between mb-1">
            <span className="text-sm">Points:</span>
            <span className="text-sm font-medium">{pointCount}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Segments:</span>
            <span className="text-sm font-medium">{segmentCount}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Avg Distance:</span>
            <span className="text-sm font-medium">
              {avgDistance > 0 ? avgDistance.toFixed(3) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Free Point:</span>
            <span className="text-sm font-medium">
              {freePointCoords 
                ? `(${freePointCoords.x}, ${freePointCoords.y})` 
                : "None"}
            </span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">History</h3>
        <div className="max-h-60 overflow-y-auto">
          {savedStates.length > 0 ? (
            savedStates.map((state, index) => (
              <div
                key={`history-${index}`}
                className={`px-3 py-2 rounded mb-1 text-sm cursor-pointer ${
                  index === savedStates.length - 1 ? "bg-blue-100" : "bg-gray-100"
                }`}
                onClick={() => onHistorySelect(index)}
              >
                Matching {index + 1}: {state.segmentCount/2} segments
                {state.freePoint && `, Free Point at (${state.freePoint.x}, ${state.freePoint.y})`}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic p-2">
              History will be displayed here as you create matchings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
import React, { useState, useEffect } from "react";
import ActionButton from "./ActionButton";
import { Matching } from "../types"
import { convertSavedStatesToMatchings } from "../utils/GraphUtils";
import { exportMatchings, exportMatchingsAsNamedCSV, exportMatchingsAsReadableTXT, ExportFormat } from "../utils/Export"

interface SidebarProps {
  className?: string;
  mode: "manual" | "auto" | "target";
  onRandomGenerate: (numPoints: number) => void;
  onHistorySelect: (index: number) => void;
  pointCount: number;
  segmentCount: number;
  avgDistance: number;
  freePointCoords: { x: number; y: number } | null;
  savedStates: any[];
  onClearHistory: () => void;
  onBuildGraph: (matchings: Matching[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  mode,
  onBuildGraph,
  onRandomGenerate,
  onHistorySelect,
  onClearHistory,
  pointCount = 0,
  segmentCount = 0,
  avgDistance = 0,
  freePointCoords = null,
  savedStates = [],
}) => {
  const [numPoints, setNumPoints] = useState<number>(5);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");

  useEffect(() => {
    if (savedStates.length > 0 && selectedIndex === null) {
      setSelectedIndex(savedStates.length - 1);
    }
  }, [savedStates]);

  const handleHistorySelect = (index: number) => {
    setSelectedIndex(index);
    onHistorySelect(index);
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < savedStates.length - 1) {
      handleHistorySelect(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      handleHistorySelect(selectedIndex - 1);
    }
  }

  // Combine classes manually
  const sidebarClasses = ["p-4 h-full overflow-auto border-l", className]
    .filter(Boolean)
    .join(" ");

    const handleExport = () => {
      if (exportFormat === "named_csv") {
        exportMatchingsAsNamedCSV(savedStates);
      } else if (exportFormat === "pretty_txt") {
        exportMatchingsAsReadableTXT(savedStates);
      } else {
        exportMatchings(savedStates, exportFormat);
      }      
    };

  return (
    <div className={sidebarClasses}>
      {mode === "auto" && (
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
              {avgDistance > 0 ? avgDistance.toFixed(3) : "-"}
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

      {/* Arrow things */}
      <div className="flex justify-between items-center mb-3">
        <ActionButton
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={selectedIndex === null || selectedIndex <= 0}
          tooltip="Previous matching from the history"
          tooltipId="prev-matching-tooltip"
        >
          ⬅ Prev
        </ActionButton>
        <span className="text-sm font-medium">
          {selectedIndex !== null ? `Matching ${selectedIndex + 1}` : "No Selection"}
        </span>
        <ActionButton
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={selectedIndex === null || selectedIndex >= savedStates.length - 1}
          tooltip="Next matching from the history"
          tooltipId="next-matching-tooltip"
        >
          Next ➡
        </ActionButton>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Matchings</h3>
        <div className="max-h-60 overflow-y-auto">
          {savedStates.length > 0 ? (
            savedStates.map((state, index) => (
              <div
                key={`history-${index}`}
                className={`px-3 py-2 rounded mb-1 text-sm flex justify-between items-center ${
                  index === selectedIndex
                    ? "bg-blue-100"
                    : "bg-gray-100"
                }`}
              >
                <div>
                  Matching {index + 1}: {state.segmentCount} segments
                  {state.freePoint &&
                    `, Free Point at (${state.freePoint.x.toFixed(
                      1
                    )}, ${state.freePoint.y.toFixed(1)})`}
                </div>
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistorySelect(index)}
                  className="ml-2"
                >
                  Load
                </ActionButton>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic p-2">
              History will be displayed here as you create matchings.
            </p>
          )}
        </div>


        <ActionButton
          variant="outline"
          size="sm"
          onClick={() => {
            onClearHistory(); 
            setSelectedIndex(null);
          }}
          tooltip="Clear all matchings from the history"
          tooltipId="clear-history-tooltip"
          className="mt-2"
        >
          Clear History
        </ActionButton>
        <ActionButton
          variant="outline"
          size="sm"
          onClick={() => {
            const matchings = convertSavedStatesToMatchings(savedStates);
            onBuildGraph(matchings);
          }}
          tooltip="Build the flip graph from saved matchings"
          tooltipId="build-graph-tooltip"
          className="mt-2"
        >
          Build FlipGraph
        </ActionButton>

        <div className="mt-6">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="border rounded px-2 py-1 text-sm w-full mb-2"
          >
            <option value="csv">Export as CSV</option>
            <option value="json">Export as JSON</option>
            <option value="txt">Export as TXT</option>
            <option value="named_csv">Export as Named CSV</option>
            <option value="pretty_txt">Export as Pretty TXT</option>
          </select>

          <ActionButton
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="w-full"
          >
            Export
          </ActionButton>
        </div>

        <div className="mt-6">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="border rounded px-2 py-1 text-sm w-full mb-2"
          >
            <option value="csv">Export as CSV</option>
            <option value="json">Export as JSON</option>
            <option value="txt">Export as TXT</option>
            <option value="named_csv">Export as Named CSV</option>
            <option value="pretty_txt">Export as Pretty TXT</option>
          </select>

          <ActionButton
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="w-full"
          >
            Export
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

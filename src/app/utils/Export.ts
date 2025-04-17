export type ExportFormat = "csv" | "json" | "txt" | "named_csv" | "pretty_txt";

export const exportMatchings = (states: any[], format: ExportFormat) => {
  let blob: Blob;
  let filename: string;

  switch (format) {
    case "csv":
      let csvContent = "MatchingIndex,SegmentIndex,StartX,StartY,EndX,EndY,FreePointX,FreePointY\n";
      states.forEach((state, matchingIndex) => {
        state.lines.forEach((line: any, segmentIndex: number) => {
          const freeX = state.freePoint?.x ?? "";
          const freeY = state.freePoint?.y ?? "";
          csvContent += `${matchingIndex},${segmentIndex},${line.start.x},${line.start.y},${line.end.x},${line.end.y},${freeX},${freeY}\n`;
        });
      });
      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      filename = "matchings.csv";
      break;

    case "json":
      blob = new Blob([JSON.stringify(states, null, 2)], {
        type: "application/json",
      });
      filename = "matchings.json";
      break;

    case "txt":
      let txtContent = "";
      states.forEach((state, i) => {
        txtContent += `Matching ${i + 1}:\n`;
        state.lines.forEach((line: any, j: number) => {
          txtContent += `  Segment ${j + 1}: (${line.start.x}, ${line.start.y}) → (${line.end.x}, ${line.end.y})\n`;
        });
        if (state.freePoint) {
          txtContent += `  Free Point: (${state.freePoint.x}, ${state.freePoint.y})\n`;
        }
        txtContent += "\n";
      });
      blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
      filename = "matchings.txt";
      break;

    default:
      console.error("Unsupported export format:", format);
      return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const exportMatchingsAsNamedCSV = (states: any[]) => {
  const pointToName = new Map<string, string>();
  const nameToPoint: Record<string, { x: number; y: number }> = {};
  const pointOrder: string[] = [];

  // Generate unique names A, B, ..., Z, AA, AB, etc.
  const getNameForIndex = (index: number): string => {
    let name = "";
    do {
      name = String.fromCharCode(65 + (index % 26)) + name;
      index = Math.floor(index / 26) - 1;
    } while (index >= 0);
    return name;
  };

  let pointIndex = 0;

  const getPointKey = (x: number, y: number) => `${x},${y}`;

  // First pass: assign names
  states.forEach((state) => {
    state.lines.forEach((line: any) => {
      const points = [line.start, line.end];
      points.forEach((pt: any) => {
        const key = getPointKey(pt.x, pt.y);
        if (!pointToName.has(key)) {
          const name = getNameForIndex(pointIndex++);
          pointToName.set(key, name);
          nameToPoint[name] = { x: pt.x, y: pt.y };
          pointOrder.push(name);
        }
      });
    });

    if (state.freePoint) {
      const key = getPointKey(state.freePoint.x, state.freePoint.y);
      if (!pointToName.has(key)) {
        const name = getNameForIndex(pointIndex++);
        pointToName.set(key, name);
        nameToPoint[name] = { x: state.freePoint.x, y: state.freePoint.y };
        pointOrder.push(name);
      }
    }
  });

  let output = "PointNames: ";
  output += pointOrder
    .map((name) => `${name}=(${nameToPoint[name].x},${nameToPoint[name].y})`)
    .join(", ");
  output += "\n\n";

  output += "MatchingIndex,SegmentIndex,StartPoint,EndPoint,FreePoint\n";

  states.forEach((state, matchingIndex) => {
    state.lines.forEach((line: any, segmentIndex: number) => {
      const startKey = getPointKey(line.start.x, line.start.y);
      const endKey = getPointKey(line.end.x, line.end.y);
      const freeKey = state.freePoint
        ? getPointKey(state.freePoint.x, state.freePoint.y)
        : "";

      output += `${matchingIndex},${segmentIndex},${pointToName.get(startKey)},${pointToName.get(endKey)},${pointToName.get(freeKey) ?? ""}\n`;
    });
  });

  const blob = new Blob([output], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "matchings_named.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const exportMatchingsAsReadableTXT = (states: any[]) => {
  const pointToName = new Map<string, string>();
  const nameToPoint: Record<string, { x: number; y: number }> = {};
  const pointOrder: string[] = [];

  const getPointKey = (x: number, y: number) => `${x},${y}`;

  const getNameForIndex = (index: number): string => {
    let name = "";
    do {
      name = String.fromCharCode(65 + (index % 26)) + name;
      index = Math.floor(index / 26) - 1;
    } while (index >= 0);
    return name;
  };

  let pointIndex = 0;


  states.forEach((state) => {
    state.lines.forEach((line: any) => {
      [line.start, line.end].forEach((pt: any) => {
        const key = getPointKey(pt.x, pt.y);
        if (!pointToName.has(key)) {
          const name = getNameForIndex(pointIndex++);
          pointToName.set(key, name);
          nameToPoint[name] = { x: pt.x, y: pt.y };
          pointOrder.push(name);
        }
      });
    });

    if (state.freePoint) {
      const key = getPointKey(state.freePoint.x, state.freePoint.y);
      if (!pointToName.has(key)) {
        const name = getNameForIndex(pointIndex++);
        pointToName.set(key, name);
        nameToPoint[name] = { x: state.freePoint.x, y: state.freePoint.y };
        pointOrder.push(name);
      }
    }
  });


  let output = "PointNames: ";
  output += pointOrder
    .map((name) => `${name}=(${nameToPoint[name].x},${nameToPoint[name].y})`)
    .join(", ");
  output += "\n\n";

  states.forEach((state, index) => {
    output += `Matching ${index + 1}:\n`;

    state.lines.forEach((line: any) => {
      const startName = pointToName.get(getPointKey(line.start.x, line.start.y));
      const endName = pointToName.get(getPointKey(line.end.x, line.end.y));
      output += `  ${startName} → ${endName}\n`;
    });

    if (state.freePoint) {
      const freeName = pointToName.get(getPointKey(state.freePoint.x, state.freePoint.y));
      output += `  Free: ${freeName}\n`;
    }

    output += "\n";
  });

  const blob = new Blob([output], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "matchings_readable.txt");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

"use client";

import dynamic from "next/dynamic";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), { ssr: false });

export default function Home() {
  return (
    <div>
      <h1>Konva Drawing Canvas</h1>
      <KonvaCanvas />
    </div>
  );
}
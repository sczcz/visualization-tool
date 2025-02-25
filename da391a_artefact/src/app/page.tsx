"use client";

import dynamic from "next/dynamic";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), { ssr: false });

export default function Home() {
  return (
    <div>
      <h1>Artefact draft</h1>
      <KonvaCanvas />
    </div>
  );
}
import { useState } from "react";

declare global {
  interface Window {
    electronAPI: {
      sendFile: (filePath: string) => void;
    };
  }
}

export default function App() {
  const [fileName, setFileName] = useState("");

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    console.log("🔥 DROP EJECUTADO");

    const file = e.dataTransfer.files?.[0];

    if (!file) {
      console.log("❌ No file");
      return;
    }

    console.log("📄 FILE OK:", file);

    setFileName(file.name);

    // ⚠️ ESTE ES EL PROBLEMA REAL EN LINUX
    const filePath = (file as any).path;

    console.log("📁 FILE PATH:", filePath);

    if (!filePath) {
      console.log("⚠ NO filePath (normal en Linux/Electron drag)");
      return;
    }

    window.electronAPI.sendFile(filePath);
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "#111",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1>LocalSend LSL</h1>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: "400px",
          height: "300px",
          border: "2px dashed white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div>ARRASTRÁ ARCHIVOS ACÁ</div>

        {fileName && <div style={{ color: "lime" }}>📄 {fileName}</div>}
      </div>
    </div>
  );
}

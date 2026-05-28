import { useEffect, useState } from "react";

declare global {
  interface Window {
    electronAPI: {
      sendFile: (file: File, device?: any) => void;
      onDeviceFound: (callback: (device: any) => void) => void;
      onUploadProgress: (callback: (data: any) => void) => void;
    };
  }
}

export default function App() {
  const [fileName, setFileName] = useState("");
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);

  useEffect(() => {
    window.electronAPI.onDeviceFound((device) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.ip === device.ip);
        if (exists) return prev;
        return [...prev, device];
      });
    });

    window.electronAPI.onUploadProgress((data) => {
      setProgress(data.progress);
      setSpeed(data.speed);
      setEta(data.eta);
    });
  }, []);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!selectedDevice) {
      console.log("❌ Seleccioná un dispositivo");
      return;
    }

    setFileName(file.name);

    window.electronAPI.sendFile(file, selectedDevice);
  }

  return (
    <div style={{ height: "100vh", background: "#111", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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

      {progress > 0 && (
        <div style={{ width: "400px", marginTop: "20px" }}>
          <div style={{ height: "10px", background: "#333", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ height: "10px", width: `${progress}%`, background: "lime" }} />
          </div>

          <div style={{ marginTop: "10px" }}>
            📤 {progress}% | ⚡ {speed} MB/s | ⏳ {eta}s
          </div>
        </div>
      )}

      <div style={{ marginTop: "30px", width: "400px" }}>
        <h2>Dispositivos encontrados</h2>

        {devices.map((device, index) => (
          <div
            key={index}
            onClick={() => setSelectedDevice(device)}
            style={{
              border: selectedDevice?.ip === device.ip ? "2px solid lime" : "1px solid gray",
              borderRadius: "10px",
              padding: "10px",
              marginTop: "10px",
              cursor: "pointer",
              background: selectedDevice?.ip === device.ip ? "#1a1a1a" : "transparent",
            }}
          >
            🖥 {device.name}
            <br />
            🌐 {device.ip}
          </div>
        ))}
      </div>
    </div>
  );
}
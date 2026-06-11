import { useEffect, useState, useRef } from "react";

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onDeviceFound) {
      window.electronAPI.onDeviceFound((device: any) => {
        setDevices((prev) => {
          const exists = prev.find((d) => d.ip === device.ip);
          if (exists) return prev;
          return [...prev, device];
        });
      });
    }

    if (window.electronAPI && window.electronAPI.onUploadProgress) {
      window.electronAPI.onUploadProgress((data: any) => {
        setProgress(data.progress);
        setSpeed(data.speed);
        setEta(data.eta);
      });
    }
  }, []);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    try {
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      procesarArchivo(file);
    } catch (err) {
      console.log("Error en drag and drop, use el boton alternativo");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file);
  }

  function procesarArchivo(file: File) {
    if (!selectedDevice) {
      alert("Seleccioná un dispositivo primero");
      return;
    }
    setFileName(file.name);
    if (window.electronAPI && window.electronAPI.sendFile) {
      window.electronAPI.sendFile(file, selectedDevice);
    }
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
        fontFamily: "sans-serif",
      }}
    >
      <h1>LocalSend LSL</h1>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: "400px",
          height: "250px",
          border: "2px dashed white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <div>ARRASTRA ARCHIVOS ACA</div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "8px 16px",
            background: "#222",
            color: "white",
            border: "1px solid white",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          O Seleccionar Archivo
        </button>

        {fileName && <div style={{ color: "lime" }}>Archivo: {fileName}</div>}
      </div>

      {progress > 0 && (
        <div style={{ width: "400px", marginTop: "20px" }}>
          <div
            style={{
              height: "10px",
              background: "#333",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "10px",
                width: `${progress}%`,
                background: "lime",
              }}
            />
          </div>
          <div style={{ marginTop: "10px" }}>
            Progreso: {progress}% | Velocidad: {speed} MB/s | Tiempo: {eta}s
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
              border:
                selectedDevice?.ip === device.ip
                  ? "2px solid lime"
                  : "1px solid gray",
              borderRadius: "10px",
              padding: "10px",
              marginTop: "10px",
              cursor: "pointer",
              background:
                selectedDevice?.ip === device.ip ? "#1a1a1a" : "transparent",
            }}
          >
            Nombre: {device.name}
            <br />
            IP: {device.ip}
          </div>
        ))}

        {devices.length === 0 && (
          <p style={{ color: "#666", textAlign: "center" }}>
            Buscando dispositivos en la red...
          </p>
        )}
      </div>
    </div>
  );
}

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ADAPTADO: Pide la lista de dispositivos reales detectados al backend de Node cada 3 segundos
  useEffect(() => {
    async function actualizarDispositivos() {
      try {
        const res = await fetch("http://localhost:4000/dispositivos");
        if (res.ok) {
          const datos = await res.json();
          setDevices(datos);
        }
      } catch (err) {
        console.log("Esperando respuesta del servidor en el puerto 4000...");
      }
    }

    actualizarDispositivos();
    const intervalo = setInterval(actualizarDispositivos, 3000);

    return () => clearInterval(intervalo);
  }, []);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    try {
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      prepararArchivo(file);
    } catch (err) {
      console.log("Error en drag and drop, use el boton alternativo");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    prepararArchivo(file);
  }

  function prepararArchivo(file: File) {
    setSelectedFile(file);
    setFileName(file.name);
  }

  // ADAPTADO: Ahora sube el archivo binario real por HTTP al puerto 4000
  async function presionarEnviar() {
    if (!selectedDevice) {
      alert("Seleccioná un dispositivo de la lista primero");
      return;
    }
    if (!selectedFile) {
      alert("Cargá un archivo primero arrastrándolo o con el botón");
      return;
    }

    try {
      setProgress(10);
      setSpeed(5);
      setEta(2);

      // Mandamos el cuerpo del archivo por HTTP Post sin usar IPC de Electron
      const respuesta = await fetch("http://localhost:4000/preparar-archivo", {
        method: "POST",
        body: selectedFile, 
        headers: {
          "Content-Type": "application/octet-stream",
          "x-file-name": encodeURIComponent(selectedFile.name)
        }
      });

      if (respuesta.ok) {
        setProgress(100);
        setSpeed(0);
        setEta(0);
        alert("¡Archivo listo en el servidor! Ya podés tocar 'TRAER ARCHIVO' en el celu.");
      } else {
        alert("Error al subir el archivo al servidor local.");
        setProgress(0);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el backend de la PC.");
      setProgress(0);
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

        {fileName && <div style={{ color: "cyan" }}>Archivo cargado: {fileName}</div>}
      </div>

      <button
        onClick={presionarEnviar}
        disabled={!selectedDevice || !selectedFile}
        style={{
          width: "400px",
          padding: "14px",
          marginTop: "15px",
          background: (!selectedDevice || !selectedFile) ? "#333" : "#00aa55",
          color: (!selectedDevice || !selectedFile) ? "#666" : "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: (!selectedDevice || !selectedFile) ? "not-allowed" : "pointer",
          transition: "0.2s"
        }}
      >
        Enviar Archivo ➔
      </button>

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
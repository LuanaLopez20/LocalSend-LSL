import { useState, useEffect } from "react";

interface Disp { name: string; ip: string; }
interface Historial { archivo: string; ip: string; dispositivo: string; fecha: string; }

export default function App() {
  const [pestanaActiva, setPestanaActiva] = useState<"enviar" | "recibir">("enviar");
  const [status, setStatus] = useState("Sistema operativo listo.");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [dispositivosRed, setDispositivosRed] = useState<Disp[]>([]);
  const [dispositivosGuardados, setDispositivosGuardados] = useState<Disp[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  
  const [ipManual, setIpManual] = useState("");
  const [aliasManual, setAliasManual] = useState("");
  const [editandoIp, setEditandoIp] = useState<string | null>(null);
  const [nuevoAlias, setNuevoAlias] = useState("");

  const cargarDatos = async () => {
    try {
      const resDisp = await fetch("http://localhost:4000/dispositivos");
      if (resDisp.ok) {
        const data = await resDisp.json();
        setDispositivosRed(data.enRed);
        setDispositivosGuardados(data.guardados);
      }
      const resHist = await fetch("http://localhost:4000/historial");
      if (resHist.ok) {
        setHistorial(await resHist.json());
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 3000);
    return () => clearInterval(interval);
  }, []);

  const guardarAlias = async (ip: string, alias: string) => {
    if (!alias) return;
    try {
      const res = await fetch("http://localhost:4000/guardar-alias", {
        method: "POST",
        body: JSON.stringify({ ip, alias }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setEditandoIp(null);
        setNuevoAlias("");
        setIpManual("");
        setAliasManual("");
        setStatus(`Alias guardado para ${ip}`);
        cargarDatos();
      }
    } catch (e) { setStatus("Error al guardar alias"); }
  };

  const eliminarGuardado = async (ip: string) => {
    try {
      await fetch("http://localhost:4000/eliminar-guardado", {
        method: "POST",
        body: JSON.stringify({ ip }),
        headers: { "Content-Type": "application/json" }
      });
      cargarDatos();
    } catch (e) { console.error(e); }
  };

  const seleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setStatus("Archivo cargado localmente.");
    }
  };

  const prepararArchivo = async () => {
    if (!selectedFile) return;
    try {
      setStatus("Preparando buffer...");
      const arrayBuffer = await selectedFile.arrayBuffer();
      const respuesta = await fetch("http://localhost:4000/preparar-archivo", {
        method: "POST",
        body: arrayBuffer,
        headers: {
          "Content-Type": "application/octet-stream",
          "x-file-name": encodeURIComponent(selectedFile.name),
        },
      });
      if (respuesta.ok) setStatus("Archivo listo.");
    } catch (err) { setStatus("Error de red."); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>LocalSend <span style={{ color: "#6a4f33" }}></span></h1>
        <p style={styles.subtitle}>Compartir archivos en red local</p>
      </div>

      <div style={styles.tabContainer}>
        <button style={{ ...styles.tabButton, ...(pestanaActiva === "enviar" ? styles.tabButtonActive : {}) }} onClick={() => setPestanaActiva("enviar")}>MANDAR</button>
        <button style={{ ...styles.tabButton, ...(pestanaActiva === "recibir" ? styles.tabButtonActive : {}) }} onClick={() => setPestanaActiva("recibir")}>RECIBIR</button>
      </div>

      <div style={styles.mainContent}>
        {pestanaActiva === "enviar" && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>IPs en Red</h2>
              <div style={styles.networkList}>
                {dispositivosRed.length === 0 ? (
                  <div style={styles.networkEmpty}><span style={styles.networkEmptyText}>Buscando señales...</span></div>
                ) : (
                  dispositivosRed.map((disp, i) => (
                    <div key={i} style={styles.networkItem}>
                      <div style={styles.networkIndicatorActive} />
                      <div style={styles.networkItemInfo}>
                        {editandoIp === disp.ip ? (
                          <div style={{ display: "flex", gap: "5px" }}>
                            <input style={styles.inputManual} value={nuevoAlias} onChange={e => setNuevoAlias(e.target.value)} placeholder="Nombre de Pepito" />
                            <button style={styles.buttonManual} onClick={() => guardarAlias(disp.ip, nuevoAlias)}>OK</button>
                            <button style={{ ...styles.buttonManual, backgroundColor: "#444" }} onClick={() => setEditandoIp(null)}>X</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: "20px" }}>
                            <div>
                              <span style={styles.networkItemName}>{disp.name}</span>
                              <span style={styles.networkItemIp}>{disp.ip}</span>
                            </div>
                            <button style={styles.buttonAction} onClick={() => { setEditandoIp(disp.ip); setNuevoAlias(disp.name); }}>Editar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>IPs Guardadas / Manuales</h2>
              <div style={styles.networkList}>
                {dispositivosGuardados.map((disp, i) => (
                  <div key={i} style={styles.networkItem}>
                    <div style={{ ...styles.networkIndicatorActive, backgroundColor: "#a67c52" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <div>
                        <span style={styles.networkItemName}>{disp.name}</span>
                        <span style={styles.networkItemIp}>{disp.ip}</span>
                      </div>
                      <button style={{ ...styles.buttonAction, backgroundColor: "#521e1e" }} onClick={() => eliminarGuardado(disp.ip)}>Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "15px", display: "flex", gap: "8px", flexDirection: "column" }}>
                <input type="text" placeholder="IP del Celular (Ej: 192.168.1.50)" value={ipManual} onChange={e => setIpManual(e.target.value)} style={styles.inputManual} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="text" placeholder="Nombre (Ej: IP de Pepito)" value={aliasManual} onChange={e => setAliasManual(e.target.value)} style={styles.inputManual} />
                  <button onClick={() => guardarAlias(ipManual, aliasManual)} style={styles.buttonManual}>GUARDAR</button>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Preparar Envío desde PC</h2>
              <label style={styles.buttonSecondary}>Seleccionar Archivo<input type="file" style={{ display: "none" }} onChange={seleccionarArchivo} /></label>
              {fileName && <div style={styles.fileContainer}><span style={styles.fileText}>{fileName}</span></div>}
              <button style={{ ...styles.buttonPrimary, ...(!selectedFile ? styles.buttonDisabled : {}) }} onClick={prepararArchivo} disabled={!selectedFile}>HABILITAR DESCARGA</button>
            </div>
          </div>
        )}

        {pestanaActiva === "recibir" && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Historial de Recepción</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                {historial.length === 0 ? (
                  <div style={styles.networkEmpty}><span style={styles.networkEmptyText}>No se recibieron archivos todavía.</span></div>
                ) : (
                  historial.map((item, i) => (
                    <div key={i} style={styles.historyItem}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={styles.historyDevice}>{item.dispositivo}</span>
                        <span style={styles.historyDate}>{item.fecha}</span>
                      </div>
                      <span style={styles.historyFile}>{item.archivo}</span>
                      <span style={styles.historyIp}>IP: {item.ip}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.footerStatus}>
        <div style={styles.statusDot} />
        <span style={styles.statusText}>Estado: {status}</span>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#0b0b0b", color: "#ffffff", minHeight: "100vh", padding: "60px 20px 100px 20px", boxSizing: "border-box" as const, display: "flex", flexDirection: "column" as const, alignItems: "center" },
  header: { textAlign: "center" as const, marginBottom: "30px" },
  title: { fontSize: "32px", fontWeight: "800", letterSpacing: "0.5px", margin: "0 0 5px 0", color: "#ffffff" },
  subtitle: { color: "#666", fontSize: "14px", margin: "0" },
  tabContainer: { display: "flex", backgroundColor: "#141414", borderRadius: "12px", padding: "4px", marginBottom: "24px", border: "1px solid #1f1f1f", width: "100%", maxWidth: "500px" },
  tabButton: { flex: 1, padding: "12px 0", backgroundColor: "transparent", border: "none", borderRadius: "8px", color: "#888", fontWeight: "bold" as const, fontSize: "14px", cursor: "pointer" },
  tabButtonActive: { backgroundColor: "#6a4f33", color: "#ffffff" },
  mainContent: { width: "100%", maxWidth: "500px" },
  card: { backgroundColor: "#141414", borderRadius: "16px", padding: "24px", marginBottom: "20px", border: "1px solid #1f1f1f", boxSizing: "border-box" as const },
  cardTitle: { color: "#ffffff", fontSize: "18px", fontWeight: "700" as const, margin: "0 0 12px 0" },
  cardDescription: { color: "#999", fontSize: "13px", lineHeight: "18px", margin: "0 0 20px 0" },
  networkList: { display: "flex", flexDirection: "column" as const, gap: "10px" },
  networkEmpty: { backgroundColor: "#1c1c1c", padding: "16px", borderRadius: "10px", textAlign: "center" as const, border: "1px solid #222222" },
  networkEmptyText: { color: "#555", fontSize: "13px" },
  networkItem: { display: "flex", alignItems: "center", backgroundColor: "#1c1c1c", padding: "12px 16px", borderRadius: "10px", border: "1px solid #222222", width: "100%", boxSizing: "border-box" as const },
  networkIndicatorActive: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6a4f33", marginRight: "14px", flexShrink: 0 },
  networkItemInfo: { display: "flex", flexDirection: "column" as const, width: "100%" },
  networkItemName: { color: "#ffffff", fontSize: "14px", fontWeight: "600" as const, display: "block" },
  networkItemIp: { color: "#777", fontSize: "12px", marginTop: "2px", display: "block" },
  inputManual: { flex: 1, backgroundColor: "#1c1c1c", border: "1px solid #222222", padding: "10px 14px", borderRadius: "8px", color: "#fff", fontSize: "13px", outline: "none" },
  buttonManual: { backgroundColor: "#6a4f33", color: "#fff", border: "none", padding: "0 16px", borderRadius: "8px", fontWeight: "bold" as const, fontSize: "12px", cursor: "pointer" },
  buttonAction: { backgroundColor: "#2d2d2d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" as const, cursor: "pointer" },
  buttonPrimary: { width: "100%", backgroundColor: "#6a4f33", color: "#ffffff", padding: "14px 0", borderRadius: "10px", border: "none", fontWeight: "bold" as const, fontSize: "14px", cursor: "pointer" },
  buttonSecondary: { display: "block", width: "100%", textAlign: "center" as const, backgroundColor: "#1c1c1c", color: "#aaa", padding: "12px 0", borderRadius: "10px", border: "1px solid #2d2d2d", fontWeight: "600" as const, fontSize: "13px", cursor: "pointer", marginBottom: "15px", boxSizing: "border-box" as const },
  buttonDisabled: { backgroundColor: "#141414", color: "#444", border: "1px solid #1f1f1f", cursor: "not-allowed" },
  fileContainer: { backgroundColor: "#1c140e", padding: "12px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #3d2d1d" },
  fileText: { color: "#e3b88d", fontSize: "13px", fontWeight: "600" as const, display: "block", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const },
  historyItem: { backgroundColor: "#1c1c1c", padding: "14px", borderRadius: "10px", border: "1px solid #222222", display: "flex", flexDirection: "column" as const },
  historyDevice: { color: "#ffffff", fontSize: "13px", fontWeight: "700" as const },
  historyDate: { color: "#555", fontSize: "11px" },
  historyFile: { color: "#e3b88d", fontSize: "14px", fontWeight: "600" as const, marginTop: "4px", wordBreak: "break-all" as const },
  historyIp: { color: "#666", fontSize: "11px", marginTop: "2px" },
  footerStatus: { position: "fixed" as const, bottom: 0, left: 0, right: 0, backgroundColor: "#141414", padding: "14px 20px", display: "flex", alignItems: "center", borderTop: "1px solid #1f1f1f" },
  statusText: { color: "#aaa", fontSize: "12px", fontWeight: "500" as const },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6a4f33", marginRight: "10px" }
};
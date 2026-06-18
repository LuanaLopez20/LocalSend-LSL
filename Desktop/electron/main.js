import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import http from "http"; 
import fs from "fs";   

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_PORT = 4000;
let mainWindow = null;

const IP_LUANA_CELU = "10.56.5.133";
const IP_KAREN_CELU = "10.56.5.154";

let archivoParaCompartir = null;

// Lista dinámica de dispositivos que están activos
let listaDispositivos = [
  { name: "Celular de Karen (Fijo)", ip: IP_KAREN_CELU, port: 4000 },
  { name: "Celular de Luana (Fijo)", ip: IP_LUANA_CELU, port: 4000 }
];

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-file-name"); 
  res.setHeader("Access-Control-Expose-Headers", "x-file-name");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- NUEVA RUTA: Le da la lista de dispositivos conectados al navegador ---
  if (req.url === "/dispositivos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listaDispositivos));
    return;
  }

  // RECEPTOR: Cuando el celu te manda un archivo (Avisamos que el celu está vivo)
  if (req.url === "/upload" && req.method === "POST") {
    const ipCliente = req.socket.remoteAddress.replace(/^.*:/, "");
    
    // Si un celu nos manda algo, lo guardamos como dispositivo activo detectado
    if (ipCliente && !listaDispositivos.some(d => d.ip === ipCliente)) {
      listaDispositivos.push({
        name: `Celular Detectado (${ipCliente})`,
        ip: ipCliente,
        port: 4000
      });
    }

    const headerName = req.headers["x-file-name"];
    const fileName = headerName ? decodeURIComponent(headerName) : "archivo_" + Date.now() + ".bin";
    const carpetaDestino = path.join(os.homedir(), "Downloads", "archivos recibidos"); 

    if (!fs.existsSync(carpetaDestino)) fs.mkdirSync(carpetaDestino, { recursive: true });

    const rutaFinal = path.join(carpetaDestino, fileName);
    const writeStream = fs.createWriteStream(rutaFinal);
    req.pipe(writeStream);

    req.on("end", () => {
      shell.openPath(carpetaDestino).catch((err) => console.log(err));
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Guardado en PC");
    });
    return;
  }

  // PREPARAR ARCHIVO (Desde la web de la PC)
  if (req.url === "/preparar-archivo" && req.method === "POST") {
    const headerName = req.headers["x-file-name"];
    let datosBuffer = [];
    req.on("data", chunk => datosBuffer.push(chunk));
    req.on("end", () => {
      archivoParaCompartir = {
        nombre: headerName ? decodeURIComponent(headerName) : "archivo.bin",
        buffer: Buffer.concat(datosBuffer)
      };
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Listo");
    });
    return;
  }

  // DESCARGAR: El celular se lo baja
  if (req.url === "/descargar" && req.method === "GET") {
    if (!archivoParaCompartir) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "x-file-name": encodeURIComponent(archivoParaCompartir.nombre),
      "Content-Disposition": `attachment; filename=${encodeURIComponent(archivoParaCompartir.nombre)}`
    });
    res.end(archivoParaCompartir.buffer);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(WS_PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP corriendo en el puerto ${WS_PORT}`);
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({ width: 1200, height: 800 });
  mainWindow.loadURL("http://localhost:5173");
});
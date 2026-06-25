import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import http from "http"; 
import fs from "fs";   
import Bonjour from "bonjour-service"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_PORT = 4000;
let mainWindow = null;

const bonjour = new Bonjour();
let listaDispositivos = []; 
let archivoParaCompartir = null;

// =================================================================
// SCONEXIÓN DINÁMICA CON BONJOUR (mDNS)
// =================================================================

// 1. PUBLICAR la PC para que los celulares la vean al escanear la red
bonjour.publish({ 
  name: `PC-${os.hostname()}`, // Nombre único reconocible en la red
  type: 'local-share',         // Cambiamos a un tipo personalizado para no mezclar con otros aparatos
  protocol: 'tcp',
  port: WS_PORT 
});

// 2. BUSCAR constantemente celulares y otras PCs en la misma red
const browser = bonjour.find({ type: 'local-share', protocol: 'tcp' });

browser.on('up', (service) => {
  const ipDetectada = service.addresses[0];
  
  // Evitar agregarse a uno mismo
  if (service.name !== `PC-${os.hostname()}` && ipDetectada) {
    // Si el dispositivo ya existía (ej. cambió de IP), lo actualizamos; si no, lo agregamos
    const index = listaDispositivos.findIndex(d => d.name === service.name);
    const dispositivo = {
      name: service.name,
      ip: ipDetectada,
      port: service.port,
      lastSeen: Date.now()
    };

    if (index !== -1) {
      listaDispositivos[index] = dispositivo;
    } else {
      listaDispositivos.push(dispositivo);
    }
    console.log(`[RED] Dispositivo Conectado: ${service.name} en http://${ipDetectada}:${service.port}`);
  }
});

// 3. REMOVER de la lista si un dispositivo se apaga o se va de la red
browser.on('down', (service) => {
  listaDispositivos = listaDispositivos.filter(d => d.name !== service.name);
  console.log(`[RED] Dispositivo Desconectado: ${service.name}`);
});

// =================================================================
// SERVIDOR HTTP (Transferencia de archivos y API)
// =================================================================

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

  // API para que el Frontend de la PC dibuje los botones de los celulares detectados
  if (req.url === "/dispositivos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listaDispositivos));
    return;
  }

  // RECEPTOR: Cuando te mandan un archivo
  if (req.url === "/upload" && req.method === "POST") {
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
      res.end("Guardado con éxito");
    });
    return;
  }

  // PREPARAR ARCHIVO (Desde la PC)
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

  // DESCARGAR (El celular se lo baja)
  if (req.url === "/descargar" && req.method === "GET") {
    if (!archivoParaCompartir) {
      res.writeHead(404);
      res.end();
      return;
    }

    const nombreArchivo = archivoParaCompartir.nombre;
    const extension = path.extname(nombreArchivo).toLowerCase();
    
    let contentType = "application/octet-stream"; 
    if (extension === ".jpg" || extension === ".jpeg") contentType = "image/jpeg";
    else if (extension === ".png") contentType = "image/png";
    else if (extension === ".pdf") contentType = "application/pdf";
    else if (extension === ".mp3") contentType = "audio/mpeg";
    else if (extension === ".mp4") contentType = "video/mp4";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": archivoParaCompartir.buffer.length,
      "x-file-name": encodeURIComponent(nombreArchivo),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nombreArchivo)}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`
    });

    res.end(archivoParaCompartir.buffer);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(WS_PORT, "0.0.0.0", () => {
  console.log(`Servidor de red local corriendo en puerto ${WS_PORT}`);
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({ width: 1200, height: 800 });
  mainWindow.loadURL("http://localhost:5173");
});
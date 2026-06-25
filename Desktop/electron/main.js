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

const DATA_DIR = path.join(os.homedir(), ".localsend_pro");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const GUARDADOS_PATH = path.join(DATA_DIR, "guardados.json");
const HISTORIAL_PATH = path.join(DATA_DIR, "historial.json");

const leerJson = (ruta, defecto) => {
  try { return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, "utf-8")) : defecto; }
  catch (e) { return defecto; }
};
const escribirJson = (ruta, datos) => fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");

let ipsGuardadas = leerJson(GUARDADOS_PATH, {});
let historialRecepcion = leerJson(HISTORIAL_PATH, []);

bonjour.publish({ 
  name: `PC-${os.hostname()}`, 
  type: 'localsend',         
  protocol: 'tcp',
  port: WS_PORT 
});

const buscarDispositivosOficiales = () => {
  const tipos = ['localsend', 'http'];
  tipos.forEach(tipo => {
    const browser = bonjour.find({ type: tipo, protocol: 'tcp' });
    browser.on('up', (service) => {
      const ipDetectada = service.addresses?.[0];
      if (service.name !== `PC-${os.hostname()}` && ipDetectada) {
        const index = listaDispositivos.findIndex(d => d.ip === ipDetectada);
        const dispositivo = {
          name: ipsGuardadas[ipDetectada] || (service.name.includes("PC") ? service.name : `📱 ${service.name}`),
          ip: ipDetectada,
          port: service.port || 53317, 
          lastSeen: Date.now()
        };
        if (index !== -1) listaDispositivos[index] = dispositivo;
        else listaDispositivos.push(dispositivo);
      }
    });
  });
};
buscarDispositivosOficiales();

setInterval(() => {
  const limite = Date.now() - 15000;
  listaDispositivos = listaDispositivos.filter(d => d.lastSeen > limite);
}, 10000);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-file-name"); 
  res.setHeader("Access-Control-Expose-Headers", "x-file-name");

  const responderJson = (data) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/dispositivos" && req.method === "GET") {
    responderJson({
      enRed: listaDispositivos.map(d => ({ ...d, name: ipsGuardadas[d.ip] || d.name })),
      guardados: Object.entries(ipsGuardadas).map(([ip, alias]) => ({ ip, name: alias }))
    });
    return;
  }

  if (req.url === "/guardar-alias" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { ip, alias } = JSON.parse(body);
        if (ip && alias) {
          ipsGuardadas[ip] = alias;
          escribirJson(GUARDADOS_PATH, ipsGuardadas);
          res.writeHead(200); res.end("Alias guardado");
        } else { res.writeHead(400); res.end("Datos invalidos"); }
      } catch (e) { res.writeHead(400); res.end(); }
    });
    return;
  }

  if (req.url === "/eliminar-guardado" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { ip } = JSON.parse(body);
        delete ipsGuardadas[ip];
        escribirJson(GUARDADOS_PATH, ipsGuardadas);
        res.writeHead(200); res.end();
      } catch (e) { res.writeHead(400); res.end(); }
    });
    return;
  }

  if (req.url === "/historial" && req.method === "GET") {
    const historialConAlias = historialRecepcion.map(h => ({
      ...h,
      dispositivo: ipsGuardadas[h.ip] || h.dispositivo
    }));
    responderJson(historialConAlias);
    return;
  }

  if (req.url === "/upload" && req.method === "POST") {
    const headerName = req.headers["x-file-name"];
    const fileName = headerName ? decodeURIComponent(headerName) : "archivo_" + Date.now() + ".bin";
    const carpetaDestino = path.join(os.homedir(), "Downloads", "archivos recibidos"); 
    const ipOrigen = req.socket.remoteAddress.replace(/^.*:/, "");

    if (!fs.existsSync(carpetaDestino)) fs.mkdirSync(carpetaDestino, { recursive: true });

    const rutaFinal = path.join(carpetaDestino, fileName);
    const writeStream = fs.createWriteStream(rutaFinal);
    req.pipe(writeStream);

    req.on("end", () => {
      const nuevoRegistro = {
        archivo: fileName,
        ip: ipOrigen,
        dispositivo: ipsGuardadas[ipOrigen] || `📱 Celular (${ipOrigen})`,
        fecha: new Date().toLocaleString()
      };
      historialRecepcion.unshift(nuevoRegistro);
      escribirJson(HISTORIAL_PATH, historialRecepcion);

      shell.openPath(carpetaDestino).catch((err) => console.error(err));
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Guardado de forma exitosa");
    });
    return;
  }

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
      res.end("Buffer preparado");
    });
    return;
  }

  if (req.url === "/descargar" && req.method === "GET") {
    if (!archivoParaCompartir) { res.writeHead(404); res.end(); return; }
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

  res.writeHead(404); res.end();
});

server.listen(WS_PORT, "0.0.0.0");

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({ 
    width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  mainWindow.loadURL("http://localhost:5173"); 
});
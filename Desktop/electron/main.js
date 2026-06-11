import { app, BrowserWindow } from "electron";
import { Bonjour } from "bonjour-service";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import http from "http"; // <-- Importamos módulo nativo HTTP
import fs from "fs";   // <-- Importamos módulo nativo de archivos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_PORT = 4000;
let mainWindow = null;
const bonjour = new Bonjour();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5173");
}

// =================================================================
// NUEVO: LEVANTAMOS EL SERVIDOR HTTP EN LA PC PARA RECIBIR ARCHIVOS
// =================================================================
const server = http.createServer((req, res) => {
  // Habilitamos CORS para que el celular no sea rechazado por seguridad web
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Ruta de prueba para el botón "Buscar PC" del celular
  if (req.url === "/ping" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "server", status: "ok" }));
    return;
  }

  // RUTA MÁGICA REFORMULADA: Recibe el archivo de forma directa y segura
  if (req.url === "/upload" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        // CORRECCIÓN 1: Limpiamos posibles espacios o saltos de línea del buffer
        const datosLimpios = body.trim();
        const payload = JSON.parse(datosLimpios);
        const { fileName, data } = payload;

        if (!fileName || !data) {
          res.writeHead(400);
          res.end("Datos incompletos");
          return;
        }

        // CORRECCIÓN 2: Guardamos directo en la raíz del proyecto para evitar errores de permisos de Linux
        const carpetaDestino = path.join(__dirname, ".."); 
        const rutaFinal = path.join(carpetaDestino, fileName);

        // Convertimos el string Base64 devuelta a archivo binario real
        fs.writeFileSync(rutaFinal, data, { encoding: "base64" });
        console.log(`\n¡¡ ARCHIVO RECIBIDO CON ÉXITO !! -> Guardado en: ${rutaFinal}`);

        // Avisamos al frontend de React en la pantalla para que muestre el archivo recibido
        if (mainWindow) {
          mainWindow.webContents.send("archivo-recibido", { fileName, path: rutaFinal });
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Archivo guardado con éxito");
      } catch (err) {
        console.error("Error adentro del servidor:", err.message);
        res.writeHead(500);
        res.end("Error interno al procesar binario");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

// Iniciamos el servidor en el puerto 4000 escuchando en 0.0.0.0 (todas las interfaces)
server.listen(WS_PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP de transferencia corriendo en el puerto ${WS_PORT}`);
});

app.whenReady().then(() => {
  createWindow();

  bonjour.publish({
    name: "LUANA-DESKTOP",
    type: "http",
    port: WS_PORT,
    txt: { username: "Luana PC", ip: getIP() }
  });

  const browser = bonjour.find({ type: "http" });

  browser.on("up", (service) => {
    if (service.name.startsWith("LOCALSEND-")) {
      const dispositivo = {
        type: "server",
        name: service.name.replace("LOCALSEND-", ""),
        ip: service.addresses[0],
        port: service.port,
      };

      if (dispositivo.ip !== getIP() && mainWindow) {
        mainWindow.webContents.send("dispositivo-encontrado", dispositivo);
      }
    }
  });
});

app.on("window-all-closed", () => {
  bonjour.destroy();
  server.close(); // Cerramos el servidor al salir
  if (process.platform !== "darwin") app.quit();
});

function getIP() {
  const nets = os.networkInterfaces();

  for (const name in nets) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        if (
          net.address.startsWith("10.") ||
          net.address.startsWith("192.168.") ||
          net.address.startsWith("172.")
        ) {
          return net.address;
        }
      }
    }
  }

  return "127.0.0.1";
}
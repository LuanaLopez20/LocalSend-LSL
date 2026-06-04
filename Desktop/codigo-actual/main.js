import { app, BrowserWindow } from "electron";
import { WebSocketServer } from "ws";
import http from "http";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4000;
let mainWindow = null;

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

app.whenReady().then(() => {
  createWindow();
  iniciarServidorHibrido();
});

function getIP() {
  const nets = os.networkInterfaces();
  for (const name in nets) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function iniciarServidorHibrido() {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    if (req.url === "/ping") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ type: "server", name: "PC Escritorio", ip: getIP() }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true });
  let writeStream = null;
  const downloadsPath = path.join(os.homedir(), "Downloads");

  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    console.log("Celular conectado por WebSocket");

    ws.on("message", (msg) => {
      try {
        const textData = msg.toString();

        if (textData.startsWith("{")) {
          const parsed = JSON.parse(textData);
          if (parsed.type === "start") {
            const fileDest = path.join(downloadsPath, parsed.fileName);
            writeStream = fs.createWriteStream(fileDest);
            console.log("Recibiendo archivo en: " + fileDest);
          }
          return;
        }

        if (textData === "__END__") {
          if (writeStream) {
            writeStream.end();
            writeStream = null;
            console.log("Archivo guardado con exito");
          }
          return;
        }

        if (writeStream) {
          const buffer = Buffer.from(textData, "base64");
          writeStream.write(buffer);
        }
      } catch (err) {
        console.log("Error al procesar bloque de datos: ", err);
      }
    });

    ws.on("close", () => {
      if (writeStream) {
        writeStream.end();
        writeStream = null;
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor hibrido activo en el puerto " + PORT);
    console.log("IP de tu PC: " + getIP());
  });
}

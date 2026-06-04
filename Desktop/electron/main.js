import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import dgram from "dgram";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WS_PORT = 4000;
const UDP_PORT = 41234;

let mainWindow = null;

function createWindow() {
  console.log("Creando ventana...");

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
  console.log("APP READY");

  createWindow();

  const udp = dgram.createSocket("udp4");

  udp.bind(UDP_PORT, () => {
    udp.setBroadcast(true);
    console.log("UDP discovery activo");
  });

  udp.on("message", (msg, rinfo) => {
    if (msg.toString() === "DISCOVER_LOCALSEND") {
      const response = JSON.stringify({
        type: "server",
        name: "DESKTOP-KAREN",
        ip: getIP(),
        port: WS_PORT,
      });

      udp.send(response, rinfo.port, rinfo.address);
    }
  });
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

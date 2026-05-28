const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

let ws;
let win;

function connectWS() {
  ws = new WebSocket("ws://localhost:4000");

  ws.on("open", () => {
    console.log("WS conectado");
  });

  ws.on("close", () => {
    console.log("WS cerrado");
    setTimeout(connectWS, 2000);
  });

  ws.on("error", (err) => {
    console.log("❌ WS ERROR:", err.message);
  });
}

app.whenReady().then(() => {
  console.log("APP READY");

  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:5173");

  connectWS();

  // 👇 IMPORTANTE: cargar discovery DESPUÉS de abrir ventana
  const { discoverDevices } = require("./udpClient.cjs");

  setTimeout(() => {
    discoverDevices((device) => {
      console.log("🖥 Dispositivo encontrado:", device);

      if (win && win.webContents) {
        win.webContents.send("device-found", device);
      }
    });
  }, 2000);
});

ipcMain.on("send-file", (_, filePath, device) => {
  console.log("🔥 IPC RECIBIDO");
  console.log("📁 PATH:", filePath);
  console.log("🎯 DEVICE:", device);

  if (!ws || ws.readyState !== 1) {
    console.log("❌ WS NO CONECTADO");
    return;
  }

  if (!device) {
    console.log("❌ NO DEVICE SELECCIONADO");
    return;
  }

  if (!filePath) return;

  filePath = filePath.replace("file://", "");

  if (!fs.existsSync(filePath)) {
    console.log("❌ EL ARCHIVO NO EXISTE");
    return;
  }

  const name = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;

  let sentBytes = 0;
  let startTime = Date.now();

  ws.send(
    JSON.stringify({
      name,
      size: totalSize,
      target: device.ip,
    })
  );

  const stream = fs.createReadStream(filePath, {
    highWaterMark: 64 * 1024,
  });

  stream.on("data", (chunk) => {
    sentBytes += chunk.length;

    const elapsed = (Date.now() - startTime) / 1000;
    const speed =
      elapsed > 0 ? sentBytes / 1024 / 1024 / elapsed : 0;

    const progress = Math.floor((sentBytes / totalSize) * 100);

    const remaining = totalSize - sentBytes;
    const eta =
      speed > 0 ? remaining / (speed * 1024 * 1024) : 0;

    win.webContents.send("upload-progress", {
      progress,
      speed: speed.toFixed(2),
      eta: eta.toFixed(1),
      sentBytes,
      totalSize,
    });

    ws.send(chunk, { binary: true });
  });

  stream.on("end", () => {
    console.log("✅ Archivo enviado");

    ws.send("__END__");

    win.webContents.send("upload-progress", {
      progress: 100,
      speed: "0.00",
      eta: "0.0",
      sentBytes: totalSize,
      totalSize,
    });
  });

  stream.on("error", (err) => {
    console.log("❌ ERROR STREAM:", err);
  });
});
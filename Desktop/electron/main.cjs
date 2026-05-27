const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

require("./udpServer.cjs");
require("./websocketServer.cjs");

let ws;

function connect() {
  ws = new WebSocket("ws://localhost:4000");

  ws.on("open", () => console.log("WS conectado"));
  ws.on("close", () => setTimeout(connect, 2000));
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  win.loadURL("http://localhost:5173");

  connect();
});

ipcMain.on("send-file", (_, filePath) => {
  console.log("IPC:", filePath);

  if (!ws || ws.readyState !== 1) return;
  if (!filePath) return;

  const name = path.basename(filePath);

  ws.send(JSON.stringify({ name }));

  const stream = fs.createReadStream(filePath, {
    highWaterMark: 64 * 1024,
  });

  stream.on("data", (chunk) => ws.send(chunk));
});

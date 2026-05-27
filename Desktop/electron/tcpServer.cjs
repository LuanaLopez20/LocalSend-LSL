const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const os = require("os");

const wss = new WebSocket.Server({ port: 4000 });

wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  let writeStream = null;

  const downloadsPath = path.join(os.homedir(), "Downloads");

  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      const meta = JSON.parse(data.toString());

      const filePath = path.join(downloadsPath, meta.name);

      console.log("📥 Guardando en:", filePath);

      writeStream = fs.createWriteStream(filePath);

      return;
    }

    if (writeStream) {
      writeStream.write(data);
    }
  });

  ws.on("close", () => {
    if (writeStream) writeStream.end();
    console.log("✔ Transferencia terminada");
  });
});

console.log("WS activo puerto 4000");

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const os = require("os");

const wss = new WebSocket.Server({ port: 4000 });

wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  let writeStream = null;

  // 🔥 FIX: carpeta correcta según tu Linux (etec usa "Descargas")
  const downloads = path.join(
    os.homedir(),
    process.platform === "win32" ? "Downloads" : "Descargas",
  );

  // 🔥 crear carpeta si no existe
  if (!fs.existsSync(downloads)) {
    fs.mkdirSync(downloads, { recursive: true });
  }

  ws.on("message", (data, isBinary) => {
    // metadata (nombre del archivo)
    if (!isBinary) {
      const meta = JSON.parse(data.toString());

      const filePath = path.join(downloads, meta.name);

      console.log("📥 Guardando en:", filePath);

      writeStream = fs.createWriteStream(filePath);
      return;
    }

    // chunks del archivo
    if (writeStream) {
      writeStream.write(data);
    }
  });

  ws.on("close", () => {
    if (writeStream) writeStream.end();
    console.log("✔ Transferencia terminada");
  });
});

console.log("WS server activo puerto 4000");

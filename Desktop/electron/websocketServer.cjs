const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const os = require("os");

const wss = new WebSocket.Server({ port: 4000 });

wss.on("connection", (ws) => {
  console.log("✅ Cliente conectado");

  let writeStream = null;
  let waitingFileData = false;

  const downloadsPath = path.join(os.homedir(), "Descargas");

  console.log("📁 Carpeta descargas:", downloadsPath);

  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      const text = data.toString();

      if (text === "__END__") {
        console.log("🏁 FIN ARCHIVO");

        if (writeStream) {
          writeStream.end(() => {
            console.log("✅ Archivo guardado correctamente");
          });
        }

        waitingFileData = false;
        return;
      }

      if (waitingFileData) {
        const buffer = Buffer.from(text, "base64");

        console.log("📦 Base64 recibido:", buffer.length);

        writeStream.write(buffer);

        return;
      }

      try {
        const meta = JSON.parse(text);

        console.log("📄 Metadata:", meta);

        const filePath = path.join(downloadsPath, meta.name);

        console.log("💾 Guardando archivo en:", filePath);

        writeStream = fs.createWriteStream(filePath);

        waitingFileData = true;

        writeStream.on("error", (err) => {
          console.log("❌ ERROR WRITE STREAM:", err);
        });

        return;
      } catch (err) {
        console.log("❌ ERROR JSON:", err);
        return;
      }
    }

    if (writeStream) {
      console.log("📦 Chunk recibido:", data.length);

      writeStream.write(data);
    } else {
      console.log("❌ No existe writeStream");
    }
  });

  ws.on("close", () => {
    console.log("🔌 WS cerrado");
  });

  ws.on("error", (err) => {
    console.log("❌ ERROR WS:", err);
  });
});

console.log("🚀 WS server activo puerto 4000");
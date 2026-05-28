const WebSocket = require("ws");

const fs = require("fs");

const path = require("path");

function enviarArchivo(filePath) {
  const ws = new WebSocket("ws://localhost:4000");

  ws.on("open", () => {
    const stats = fs.statSync(filePath);

    const fileName = path.basename(filePath);

    ws.send(
      JSON.stringify({
        name: fileName,
        size: stats.size,
      }),
    );

    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      ws.send(chunk);
    });

    stream.on("end", () => {
      ws.close();
      
      console.log("Archivo enviado");
    });
  });
}

module.exports = enviarArchivo;

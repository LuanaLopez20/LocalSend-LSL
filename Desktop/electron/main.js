import dgram from "dgram";
import { serve } from "bun";
import os from "os";
import fs from "fs";

const WS_PORT = 4000;
const UDP_PORT = 41234;

/* ================== UDP DISCOVERY ================== */

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
      port: WS_PORT
    });

    udp.send(response, rinfo.port, rinfo.address);
  }
});

/* ================== WS SERVER ================== */

let writeStream = null;

serve({
  port: WS_PORT,

  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WS only");
  },

  websocket: {
    open() {
      console.log("WS conectado");
    },

    message(ws, msg) {
      const data = JSON.parse(msg);

      if (data.type === "start") {
        writeStream = fs.createWriteStream(
          `./descargas/${data.fileName}`
        );
        console.log("Recibiendo:", data.fileName);
      }

      if (data.type === "chunk") {
        writeStream.write(Buffer.from(data.data));
      }

      if (data.type === "end") {
        writeStream.end();
        console.log("Archivo completo");
      }
    }
  }
});

function getIP() {
  const nets = os.networkInterfaces();

  for (const name in nets) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "127.0.0.1";
}
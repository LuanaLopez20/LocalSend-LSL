const dgram = require("dgram");

const server = dgram.createSocket("udp4");
const PORT = 53317;

server.on("message", (msg, rinfo) => {
  const message = msg.toString();

  if (message === "DISCOVER_LOCALSEND") {
    const response = JSON.stringify({
      name: "Local Device",
      port: 4000,
    });

    server.send(response, rinfo.port, rinfo.address);
  }
});

server.bind(PORT, () => {
  server.setBroadcast(true);
  console.log("UDP activo");
});
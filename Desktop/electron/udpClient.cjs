const dgram = require("dgram");

let client = null;
const PORT = 53317;

function discoverDevices(callback) {
  if (!client) {
    client = dgram.createSocket("udp4");

    client.on("message", (msg, rinfo) => {
      try {
        const device = JSON.parse(msg.toString());

        callback({
          ...device,
          ip: rinfo.address,
        });
      } catch (err) {
        console.log("❌ ERROR UDP:", err.message);
      }
    });

    client.on("error", (err) => {
      console.log("❌ UDP ERROR:", err.message);
    });
  }

  client.bind(0, () => {
    client.setBroadcast(true);

    const message = Buffer.from("DISCOVER_LOCALSEND");

    client.send(
      message,
      0,
      message.length,
      PORT,
      "255.255.255.255",
      () => {
        console.log("🔍 Buscando dispositivos...");
      }
    );
  });
}

module.exports = {
  discoverDevices,
};
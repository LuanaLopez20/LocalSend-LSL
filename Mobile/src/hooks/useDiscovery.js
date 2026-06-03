import dgram from "react-native-udp";
import { useEffect, useState } from "react";

export default function useDiscovery() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const socket = dgram.createSocket("udp4");

    socket.bind(0);

    socket.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "server") {
          setDevices((prev) => {
            if (prev.find(d => d.ip === data.ip)) return prev;
            return [...prev, data];
          });
        }
      } catch {}
    });

    socket.send(
      "DISCOVER_LOCALSEND",
      0,
      0,
      41234,
      "255.255.255.255"
    );

    return () => socket.close();
  }, []);

  return devices;
}
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import useDiscovery from "./hooks/useDiscovery";

export default function HomeScreen() {
  const devices = useDiscovery();

  const [ip, setIp] = useState("");
  const [status, setStatus] = useState("Desconectado");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  function conectarAuto(ip: string) {
    const socket = new WebSocket(`ws://${ip}:4000`);

    socket.onopen = () => {
      console.log("✅ Conectado");
      setStatus("Conectado");
    };

    socket.onerror = () => {
      console.log("❌ Error");
      setStatus("Error");
    };

    socket.onclose = () => {
      console.log("🔌 Desconectado");
      setStatus("Desconectado");
    };

    setWs(socket);
    setIp(ip);
  }

  async function seleccionarArchivo() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    setSelectedFile(file);
    setFileName(file.name);

    console.log("📄 Archivo:", file);
  }

  async function enviarArchivo() {
    if (!ws) {
      alert("Conectate primero");
      return;
    }

    if (!selectedFile) {
      alert("Seleccioná un archivo");
      return;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(
        selectedFile.uri,
        { encoding: "base64" as any }
      );

      ws.send(
        JSON.stringify({
          type: "start",
          name: selectedFile.name,
          size: selectedFile.size,
        })
      );

      ws.send(base64);

      ws.send("__END__");

      console.log("✅ Archivo enviado");
    } catch (err) {
      console.log("❌ Error enviando:", err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LocalSend Mobile</Text>

      {/* 🔍 DEVICES DISCOVERY */}
      <Text style={{ color: "white", marginBottom: 10 }}>
        Dispositivos encontrados:
      </Text>

      {devices.map((d) => (
        <TouchableOpacity
          key={d.ip}
          style={styles.device}
          onPress={() => conectarAuto(d.ip)}
        >
          <Text style={{ color: "white" }}>🖥 {d.name}</Text>
          <Text style={{ color: "gray" }}>{d.ip}</Text>
        </TouchableOpacity>
      ))}

      {/* IP MANUAL (opcional) */}
      <TextInput
        placeholder="IP de la PC (opcional)"
        placeholderTextColor="#777"
        value={ip}
        onChangeText={setIp}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => conectarAuto(ip)}
      >
        <Text style={styles.buttonText}>Conectar manual</Text>
      </TouchableOpacity>

      {/* ARCHIVOS */}
      <TouchableOpacity
        style={styles.button}
        onPress={seleccionarArchivo}
      >
        <Text style={styles.buttonText}>
          Seleccionar archivo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={enviarArchivo}
      >
        <Text style={styles.buttonText}>
          Enviar archivo
        </Text>
      </TouchableOpacity>

      {fileName !== "" && (
        <Text style={styles.file}>📄 {fileName}</Text>
      )}

      <Text style={styles.status}>
        Estado: {status}
      </Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
    padding: 12,
    color: "white",
    marginTop: 20,
  },

  button: {
    backgroundColor: "#00aa55",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },

  file: {
    color: "lime",
    marginTop: 20,
    fontSize: 16,
  },

  status: {
    color: "white",
    marginTop: 20,
    fontSize: 18,
  },

  device: {
    backgroundColor: "#222",
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    width: "100%",
  },
});
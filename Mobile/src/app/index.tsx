import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";

export default function HomeScreen() {
  const [status, setStatus] = useState("Desconectado");
  const [dispositivos, setDispositivos] = useState<string[]>([]);
  const [pcSeleccionada, setPcSeleccionada] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  async function buscarPCAutomaticamente() {
    setStatus("Escaneando red local...");
    setDispositivos([]);

    try {
      const ipCelular = await Network.getIpAddressAsync();
      if (!ipCelular || ipCelular.includes(":")) {
        setStatus("Error: Requiere Wi-Fi IPv4");
        return;
      }

      const partes = ipCelular.split(".");
      const baseRed = `${partes[0]}.${partes[1]}.${partes[2]}.`;
      const promesas = [];

      for (let i = 1; i < 255; i++) {
        const ipAProbar = `${baseRed}${i}`;
        const controlador = new AbortController();
        const timeout = setTimeout(() => controlador.abort(), 60);

        const promesaIntento = fetch(`http://${ipAProbar}:4000/ping`, {
          signal: controlador.signal,
        })
          .then((res) => res.json())
          .then((data) => {
            clearTimeout(timeout);
            if (data.type === "server") {
              setDispositivos((prev) => {
                if (!prev.includes(ipAProbar)) return [...prev, ipAProbar];
                return prev;
              });
            }
          })
          .catch(() => {
            clearTimeout(timeout);
          });

        promesas.push(promesaIntento);
      }

      await Promise.all(promesas);
      setStatus("Escaneo finalizado");
    } catch (err) {
      setStatus("Error al escanear");
    }
  }

  function seleccionarPC(ipDestino: string) {
    if (ws) ws.close();

    setStatus("Conectando...");
    const socket = new WebSocket(`ws://${ipDestino}:4000`);

    socket.onopen = () => {
      setStatus("Conectado (Listo para enviar o recibir)");
      setPcSeleccionada(ipDestino);
      setWs(socket);
    };

    socket.onmessage = async (event) => {
      try {
        const textData = event.data.toString();

        if (textData.startsWith("{")) {
          const parsed = JSON.parse(textData);
          if (parsed.type === "start") {
            setStatus("Recibiendo: " + parsed.fileName);
            setFileName(parsed.fileName);
            await FileSystem.writeAsStringAsync(
              FileSystem.documentDirectory + parsed.fileName,
              "",
            );
          }
          return;
        }

        if (textData === "__END__") {
          setStatus("Archivo recibido y guardado");
          return;
        }

        if (fileName) {
          const archivoUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(archivoUri, textData, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (err) {
        setStatus("Error al recibir datos de la PC");
      }
    };

    socket.onerror = () => {
      setStatus("Error de conexion");
    };

    socket.onclose = () => {
      setStatus("Desconectado");
      setWs(null);
      setPcSeleccionada("");
      setFileName("");
    };
  }

  async function seleccionarArchivo() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled) return;

    const file = result.assets[0];
    setSelectedFile(file);
    setFileName(file.name);
  }

  async function enviarArchivo() {
    if (!ws) {
      alert("Selecciona una PC de la lista primero");
      return;
    }
    if (!selectedFile) {
      alert("Selecciona un archivo primero");
      return;
    }

    try {
      setStatus("Leyendo archivo...");
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      ws.send(
        JSON.stringify({
          type: "start",
          fileName: selectedFile.name,
          size: selectedFile.size,
        }),
      );

      setStatus("Enviando...");
      ws.send(base64);
      ws.send("__END__");
      setStatus("Envio completado");
    } catch (err) {
      setStatus("Error al enviar");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LocalSend Mobile</Text>

      <TouchableOpacity
        style={styles.buttonBuscar}
        onPress={buscarPCAutomaticamente}
      >
        <Text style={styles.buttonText}>Escanear Red Wi-Fi</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Dispositivos en la red:</Text>

      <ScrollView style={styles.listaContainer}>
        {dispositivos.map((ip) => (
          <TouchableOpacity
            key={ip}
            style={[
              styles.dispositivoItem,
              pcSeleccionada === ip && styles.dispositivoSeleccionado,
            ]}
            onPress={() => seleccionarPC(ip)}
          >
            <Text style={styles.dispositivoText}>PC de Escritorio ({ip})</Text>
          </TouchableOpacity>
        ))}
        {dispositivos.length === 0 && (
          <Text style={styles.noDispositivos}>Buscando estaciones...</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={seleccionarArchivo}>
        <Text style={styles.buttonText}>Seleccionar Archivo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={enviarArchivo}>
        <Text style={styles.buttonText}>Enviar Archivo</Text>
      </TouchableOpacity>

      {fileName !== "" && <Text style={styles.file}>Archivo: {fileName}</Text>}
      <Text style={styles.status}>Estado: {status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  title: { color: "white", fontSize: 30, fontWeight: "bold", marginBottom: 20 },
  sectionTitle: {
    color: "#aaa",
    fontSize: 16,
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 10,
  },
  listaContainer: {
    width: "100%",
    maxHeight: 150,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  dispositivoItem: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  dispositivoSeleccionado: {
    borderColor: "#00ffcc",
    backgroundColor: "#11332c",
  },
  dispositivoText: { color: "white", fontWeight: "600" },
  noDispositivos: { color: "#666", textAlign: "center", marginTop: 10 },
  buttonBuscar: {
    backgroundColor: "#0077ff",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#00aa55",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
  file: { color: "#00ffcc", marginTop: 20, fontSize: 16 },
  status: { color: "white", marginTop: 20, fontSize: 18 },
});

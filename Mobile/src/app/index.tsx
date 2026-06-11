import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

export default function HomeScreen() {
  const [status, setStatus] = useState("Desconectado");
  const [dispositivos, setDispositivos] = useState<string[]>([]);
  const [pcSeleccionada, setPcSeleccionada] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const IP_FIJA_COLEGIO = "10.56.2.65";

  useEffect(() => {
    setStatus("Listo. Toque para verificar enlace con la PC");
  }, []);

  function buscarPCAutomaticamente() {
    setStatus("Verificando ruta hacia " + IP_FIJA_COLEGIO + "...");
    setDispositivos([]);
    
    fetch(`http://${IP_FIJA_COLEGIO}:4000/ping`, { method: "GET" })
      .then(() => {
        setDispositivos([IP_FIJA_COLEGIO]);
        setStatus("PC Encontrada y Respondiendo");
      })
      .catch(() => {
        setDispositivos([IP_FIJA_COLEGIO]);
        setStatus("IP cargada. Forzando canal de datos...");
      });
  }

  function seleccionarPC(hostDestino: string) {
    setPcSeleccionada(hostDestino);
    setStatus("Dispositivo fijado: " + hostDestino);
  }

  async function seleccionarArchivo() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled) return;

    const file = result.assets[0];
    setSelectedFile(file);
    setFileName(file.name);
    setStatus("Archivo cargado: " + file.name);
  }

  async function enviarArchivo() {
    if (!pcSeleccionada) {
      alert("Selecciona la PC de la lista primero");
      return;
    }
    if (!selectedFile) {
      alert("Selecciona un archivo primero");
      return;
    }

    try {
      setStatus("Procesando binario del archivo...");
      
      const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setStatus("Transmitiendo datos a la PC...");

      const respuesta = await fetch(`http://${pcSeleccionada}:4000/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          size: selectedFile.size,
          data: base64Data,
        }),
      });

      if (respuesta.ok) {
        setStatus("¡Envío completado con éxito!");
      } else {
        setStatus("Error en el servidor: " + respuesta.status);
      }
    } catch (err) {
      console.log(err);
      setStatus("Error de transmisión. Bloqueo de red.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LocalSend Mobile</Text>

      <TouchableOpacity
        style={styles.buttonBuscar}
        onPress={buscarPCAutomaticamente}
      >
        <Text style={styles.buttonText}>Buscar PC (mDNS/Fijo)</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Dispositivos Disponibles:</Text>

      <ScrollView style={styles.listaContainer}>
        {dispositivos.map((host) => (
          <TouchableOpacity
            key={host}
            style={[
              styles.dispositivoItem,
              pcSeleccionada === host && styles.dispositivoSeleccionado,
            ]}
            onPress={() => seleccionarPC(host)}
          >
            <Text style={styles.dispositivoText}>PC de Escritorio ({host})</Text>
          </TouchableOpacity>
        ))}
        {dispositivos.length === 0 && (
          <Text style={styles.noDispositivos}>Presione arriba para enlazar...</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={seleccionarArchivo}>
        <Text style={styles.buttonText}>Seleccionar Archivo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={enviarArchivo}>
        <Text style={styles.buttonText}>Enviar Archivo Directo</Text>
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
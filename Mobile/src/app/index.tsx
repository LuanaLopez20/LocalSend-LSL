import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; 
import * as Sharing from "expo-sharing"; 
import * as Network from "expo-network";

export default function HomeScreen() {
  const [status, setStatus] = useState("Desconectado");
  const [dispositivos, setDispositivos] = useState<string[]>([]);
  const [pcSeleccionada, setPcSeleccionada] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // IP de la PC de la escuela (Confirmada por ifconfig)
  const IP_PC_COLEGIO = "10.56.2.18"; 
  
  // CORREGIDO: La IP real de Karen que encontramos recién
  const IP_KAREN_CELU = "10.56.5.124";

  useEffect(() => {
    setStatus("Listo para enviar y recibir");
  }, []);

  function buscarPCAutomaticamente() {
    setStatus("Conectando con la PC...");
    setDispositivos([IP_PC_COLEGIO]);
    setPcSeleccionada(IP_PC_COLEGIO);
    setStatus("Enlazado con la PC: " + IP_PC_COLEGIO);
  }

  function seleccionarPC(hostDestino: string) {
    setPcSeleccionada(hostDestino);
    setStatus("Enlazado con la PC: " + hostDestino);
  }

  async function descargarArchivoDePC() {
    try {
      setStatus("Verificando identidad...");
      
      // Obtenemos la IP que el router le dio al celu en este instante
      const infoRed = await Network.getIpAddressAsync();
      
      console.log("IP detectada en el celular:", infoRed);

      // Verificación estricta: si no es la IP de Karen, rebota
      if (infoRed !== IP_KAREN_CELU) {
        setStatus("Acceso denegado.");
        Alert.alert(
          "Dispositivo no autorizado", 
          `Tu IP (${infoRed}) no coincide con la IP autorizada de Karen (${IP_KAREN_CELU}).`
        );
        return; 
      }

      const ipAUsar = pcSeleccionada || IP_PC_COLEGIO;
      setStatus("Descargando archivo de la PC...");
      const urlDescarga = `http://${ipAUsar}:4000/descargar`;
      const rutaDestinoCelu = FileSystem.documentDirectory + "archivo_recibido.pdf";

      setStatus("Transfiriendo datos...");
      const resultado = await FileSystem.downloadAsync(urlDescarga, rutaDestinoCelu);

      if (resultado.status === 200) {
        setStatus("¡Archivo recibido con éxito!");
        
        const puedeCompartir = await Sharing.isAvailableAsync();
        if (puedeCompartir) {
          await Sharing.shareAsync(rutaDestinoCelu);
        } else {
          Alert.alert("¡Éxito total!", "El archivo se descargó correctamente en el celular.");
        }
      } else if (resultado.status === 404) {
        setStatus("La PC no tiene archivos listos.");
        alert("Asegurate de haber cargado el archivo y tocado 'Enviar' en la compu primero.");
      } else {
        setStatus("Error de la PC: " + resultado.status);
      }
    } catch (err) {
      console.log(err);
      setStatus("Error de conexión o validación.");
      alert("Error al intentar conectar. Revisá que la PC tenga el proceso abierto.");
    }
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
    const ipAUsar = pcSeleccionada || IP_PC_COLEGIO;
    if (!selectedFile) {
      alert("Selecciona un archivo primero");
      return;
    }

    try {
      setStatus("Transmitiendo a la PC...");
      const formData = new FormData();
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream",
      } as any);

      const respuesta = await fetch(`http://${ipAUsar}:4000/upload`, {
        method: "POST",
        body: formData,
        headers: { "x-file-name": encodeURIComponent(selectedFile.name) }
      });

      if (respuesta.ok) {
        setStatus("¡Enviado a la PC con éxito!");
      } else {
        setStatus("Error: " + respuesta.status);
      }
    } catch (err) {
      setStatus("Error de red.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LocalSend Pro</Text>

      <TouchableOpacity style={styles.buttonBuscar} onPress={buscarPCAutomaticamente}>
        <Text style={styles.buttonText}>1. Buscar Computadora</Text>
      </TouchableOpacity>

      <ScrollView style={styles.listaContainer}>
        {dispositivos.map((host) => (
          <TouchableOpacity
            key={host}
            style={[styles.dispositivoItem, pcSeleccionada === host && styles.dispositivoSeleccionado]}
            onPress={() => seleccionarPC(host)}
          >
            <Text style={styles.dispositivoText}>PC de Luana/Karen ({host})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.buttonRecibir} onPress={descargarArchivoDePC}>
        <Text style={styles.buttonText}>➔ TRAER ARCHIVO DE LA PC</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />

      <TouchableOpacity style={styles.button} onPress={seleccionarArchivo}>
        <Text style={styles.buttonText}>Seleccionar Archivo (Para enviar)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={enviarArchivo}>
        <Text style={styles.buttonText}>Enviar a PC ➔</Text>
      </TouchableOpacity>

      {fileName !== "" && <Text style={styles.file}>Archivo a enviar: {fileName}</Text>}
      <Text style={styles.status}>Estado: {status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", justifyContent: "center", alignItems: "center", padding: 20, paddingTop: 60 },
  title: { color: "white", fontSize: 30, fontWeight: "bold", marginBottom: 20 },
  listaContainer: { width: "100%", maxHeight: 80, backgroundColor: "#1a1a1a", borderRadius: 10, padding: 10, marginBottom: 20 },
  dispositivoItem: { backgroundColor: "#222", padding: 12, borderRadius: 8, marginBottom: 8 },
  dispositivoSeleccionado: { borderColor: "#00ffcc", borderWidth: 1, backgroundColor: "#11332c" },
  dispositivoText: { color: "white", fontWeight: "600" },
  buttonBuscar: { backgroundColor: "#0077ff", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, width: "100%", alignItems: "center" },
  buttonRecibir: { backgroundColor: "#8b5a2b", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, width: "100%", alignItems: "center", marginTop: 5 },
  button: { backgroundColor: "#00aa55", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10, marginTop: 10, width: "100%", alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold" },
  file: { color: "#00ffcc", marginTop: 20, fontSize: 16 },
  status: { color: "white", marginTop: 20, fontSize: 18 },
});
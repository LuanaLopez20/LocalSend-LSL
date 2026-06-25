import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, TextInput } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; 
import * as Sharing from "expo-sharing"; 
import * as Network from "expo-network"; 

interface Dispositivo {
  name: string;
  ip: string;
  port: number;
}

export default function HomeScreen() {
  const [pestanaActiva, setPestanaActiva] = useState<"enviar" | "recibir">("enviar");
  const [status, setStatus] = useState("Desconectado");
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [pcSeleccionada, setPcSeleccionada] = useState<Dispositivo | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [ipManual, setIpManual] = useState("10.56.2.18");

  useEffect(() => {
    setStatus("Listo para buscar computadora.");
    buscarPCAutomaticamente();
  }, []);

  async function buscarPCAutomaticamente() {
    try {
      setStatus("Escaneando segmento de la PC...");
      setDispositivos([]);
      
      let encontrada = false;
      const promesasEscaneo = [];
      const segmentoEscuela = "10.56.2.";

      for (let i = 1; i < 255; i++) {
        const ipPrueba = `${segmentoEscuela}${i}`;
        
        promesasEscaneo.push(
          fetch(`http://${ipPrueba}:4000/dispositivos`, { method: "GET" })
            .then(async (res) => {
              if (res.ok) {
                const pcData: Dispositivo = {
                  name: "PC Escuela (Electron)",
                  ip: ipPrueba,
                  port: 4000
                };
                setDispositivos([pcData]);
                setPcSeleccionada(pcData);
                setStatus(`Enlazado a: ${ipPrueba}`);
                encontrada = true;
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promesasEscaneo); 
      
      if (!encontrada) {
        setStatus("Auto-scan falló o requiere forzar.");
      }

    } catch (error) {
      setStatus("Error en el escaneo.");
    }
  }

  function seleccionarPC(disp: Dispositivo) {
    setPcSeleccionada(disp);
    setStatus("Conectado con: " + disp.name);
  }

  function conectarManualmente() {
    if (!ipManual.trim()) {
      Alert.alert("Error", "Escribe una dirección IP válida.");
      return;
    }
    const pcData: Dispositivo = {
      name: "PC Conexión Forzada",
      ip: ipManual.trim(),
      port: 4000
    };
    setDispositivos([pcData]);
    setPcSeleccionada(pcData);
    setStatus(`Conectado manualmente a: ${ipManual.trim()}`);
  }

  async function descargarArchivoDePC() {
    if (!pcSeleccionada) {
      Alert.alert("Atención", "Primero necesitas enlazar la PC en la pestaña superior.");
      return;
    }

    try {
      setStatus("Descargando...");
      const urlDescarga = `http://${pcSeleccionada.ip}:${pcSeleccionada.port}/descargar`;
      const rutaDestinoCelu = FileSystem.documentDirectory + "temp_file";

      const resultado = await FileSystem.downloadAsync(urlDescarga, rutaDestinoCelu);

      if (resultado.status === 200) {
        setStatus("Archivo recibido con éxito.");
        const headerName = resultado.headers["x-file-name"] || resultado.headers["X-File-Name"];
        let nombreFinal = "archivo_recibido.bin";
        
        if (headerName) {
          nombreFinal = decodeURIComponent(headerName);
        }

        const rutaConExtension = FileSystem.documentDirectory + nombreFinal;
        await FileSystem.moveAsync({ from: rutaDestinoCelu, to: rutaConExtension });
        
        const puedeCompartir = await Sharing.isAvailableAsync();
        if (puedeCompartir) {
          await Sharing.shareAsync(rutaConExtension);
        } else {
          Alert.alert("Éxito", `Guardado como: ${nombreFinal}`);
        }
      } else {
        setStatus("PC sin archivos.");
        Alert.alert("Cola vacía", "Carga el archivo en la PC primero.");
      }
    } catch (err) {
      setStatus("Error de conexión.");
    }
  }

  async function seleccionarArchivo() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled) return;

    const file = result.assets[0];
    setSelectedFile(file);
    setFileName(file.name);
    setStatus("Archivo cargado.");
  }

  async function enviarArchivo() {
    if (!pcSeleccionada || !selectedFile) {
      Alert.alert("Error", "Falta seleccionar archivo o enlazar la PC.");
      return;
    }

    try {
      setStatus("Transmitiendo...");
      const formData = new FormData();
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream",
      } as any);

      const respuesta = await fetch(`http://${pcSeleccionada.ip}:${pcSeleccionada.port}/upload`, {
        method: "POST",
        body: formData,
        headers: { "x-file-name": encodeURIComponent(selectedFile.name) }
      });

      if (respuesta.ok) {
        setStatus("Enviado con éxito.");
        Alert.alert("Éxito", "Archivo enviado a la PC.");
      } else {
        setStatus("Error del servidor.");
      }
    } catch (err) {
      setStatus("Error de red.");
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>LocalSend<Text style={{ color: "#6a4f33" }}></Text></Text>
        <Text style={styles.subtitle}>Compartir archivos en red local</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, pestanaActiva === "enviar" && styles.tabButtonActive]}
          onPress={() => setPestanaActiva("enviar")}
        >
          <Text style={[styles.tabText, pestanaActiva === "enviar" && styles.tabTextActive]}>MANDAR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, pestanaActiva === "recibir" && styles.tabButtonActive]}
          onPress={() => setPestanaActiva("recibir")}
        >
          <Text style={[styles.tabText, pestanaActiva === "recibir" && styles.tabTextActive]}>RECIBIR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.cardInfoConexion}>
          <Text style={styles.conexionText}>
            Enlace actual: {pcSeleccionada ? `PC: ${pcSeleccionada.name} (${pcSeleccionada.ip})` : "Sin enlazar dispositivo"}
          </Text>
        </View>

        {pestanaActiva === "enviar" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preparar Envío</Text>
              <Text style={styles.cardDescription}>Selecciona un documento, foto o video desde tu celular para transferir directamente a la PC.</Text>
              
              <TouchableOpacity style={styles.buttonSecondary} onPress={seleccionarArchivo}>
                <Text style={styles.buttonSecondaryText}>Seleccionar Archivo</Text>
              </TouchableOpacity>

              {fileName !== "" && (
                <View style={styles.fileContainer}>
                  <Text style={styles.fileText} numberOfLines={1}>Archivo: {fileName}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.buttonPrimary, (!pcSeleccionada || !selectedFile) && styles.buttonDisabled]} 
                onPress={enviarArchivo}
                disabled={!pcSeleccionada || !selectedFile}
              >
                <Text style={styles.buttonText}>SUBIR A LA PC</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Configurar Red</Text>
                <TouchableOpacity style={styles.badgeBuscar} onPress={buscarPCAutomaticamente}>
                  <Text style={styles.badgeText}>BÚSQUEDA RÁPIDA</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.label}>Equipos en subred:</Text>
              <View style={styles.listaContainer}>
                {dispositivos.length === 0 ? (
                  <Text style={styles.noDispositivos}>Ningún host detectado en 10.56.2.X (Use forzar origen)</Text>
                ) : (
                  dispositivos.map((disp) => (
                    <TouchableOpacity
                      key={disp.ip}
                      style={[styles.dispositivoItem, pcSeleccionada?.ip === disp.ip && styles.dispositivoSeleccionado]}
                      onPress={() => seleccionarPC(disp)}
                    >
                      <Text style={styles.dispositivoText}>{disp.name}</Text>
                      <Text style={styles.dispositivoSubtext}>{disp.ip}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.separator} />
              <Text style={styles.label}>Conexión Directa Obligatoria:</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 10.56.2.18"
                  placeholderTextColor="#444"
                  value={ipManual}
                  onChangeText={setIpManual}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.buttonManual} onPress={conectarManualmente}>
                  <Text style={styles.buttonManualText}>FORZAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {pestanaActiva === "recibir" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Descargar desde la PC</Text>
              <Text style={styles.cardDescription}>
                Si preparaste un archivo en la aplicación de Electron (PC), presione el botón inferior para iniciar la transferencia hacia el almacenamiento local.
              </Text>
              
              <TouchableOpacity 
                style={[styles.buttonPrimary, !pcSeleccionada && styles.buttonDisabled]} 
                onPress={descargarArchivoDePC}
                disabled={!pcSeleccionada}
              >
                <Text style={styles.buttonText}>TRAER ARCHIVO AL CELULAR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardInfoAyuda}>
              <Text style={styles.ayudaTitle}>Instrucciones de Recepción</Text>
              <Text style={styles.ayudaText}>1. En la PC, cargue el archivo correspondiente en la aplicación Electron.</Text>
              <Text style={styles.ayudaText}>2. Verifique el estado de la vinculación IP en el panel de Enviar.</Text>
              <Text style={styles.ayudaText}>3. Ejecute la descarga para procesar el almacenamiento del elemento.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footerStatus}>
        <View style={[styles.statusDot, status.includes("Éxito") || status.includes("Enlazado") || status.includes("Conectado") ? styles.dotGreen : styles.dotOrange]} />
        <Text style={styles.statusText} numberOfLines={1}>Estado: {status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", paddingHorizontal: 16 },
  header: { marginTop: 50, marginBottom: 15, alignItems: "center" },
  title: { color: "#ffffff", fontSize: 32, fontWeight: "900", letterSpacing: 0.5 },
  subtitle: { color: "#666", fontSize: 14, marginTop: 4 },
  scrollContainer: { paddingBottom: 100 },
  
  tabContainer: { flexDirection: "row", backgroundColor: "#141414", borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: "#1f1f1f" },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 8 },
  tabButtonActive: { backgroundColor: "#6a4f33" },
  tabText: { color: "#888", fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },
  tabTextActive: { color: "#ffffff" },

  cardInfoConexion: { backgroundColor: "#1c140e", padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "#3d2d1d", alignItems: "center" },
  conexionText: { color: "#e3b88d", fontSize: 13, fontWeight: "600" },

  card: { backgroundColor: "#141414", borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#1f1f1f" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  cardDescription: { color: "#aaa", fontSize: 13, marginBottom: 16, lineHeight: 18 },
  label: { color: "#666", fontSize: 12, fontWeight: "bold", marginBottom: 8, textTransform: "uppercase" },
  
  badgeBuscar: { backgroundColor: "#222", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#333" },
  badgeText: { color: "#6a4f33", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5 },
  buttonPrimary: { backgroundColor: "#6a4f33", paddingVertical: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonSecondary: { backgroundColor: "#1e1e1e", paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2d2d2d", marginBottom: 10 },
  buttonDisabled: { backgroundColor: "#1c1c1c", opacity: 0.4 },
  buttonText: { color: "#ffffff", fontWeight: "bold", fontSize: 15, letterSpacing: 0.5 },
  buttonSecondaryText: { color: "#ccc", fontWeight: "600", fontSize: 14 },
  
  listaContainer: { minHeight: 45, justifyContent: "center" },
  noDispositivos: { color: "#444", fontStyle: "italic", fontSize: 13, textAlign: "center", paddingVertical: 10 },
  dispositivoItem: { backgroundColor: "#1c1c1c", padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dispositivoSeleccionado: { borderColor: "#6a4f33", borderWidth: 1.5, backgroundColor: "#201710" },
  dispositivoText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  dispositivoSubtext: { color: "#6a4f33", fontSize: 12, fontWeight: "600" },
  
  fileContainer: { backgroundColor: "#1a2421", padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#23332e" },
  fileText: { color: "#00ffcc", fontSize: 13, fontWeight: "600" },
  
  separator: { height: 1, backgroundColor: "#1f1f1f", marginVertical: 14 },
  inputContainer: { flexDirection: "row", width: "100%", gap: 10, marginTop: 4 },
  input: { flex: 1, backgroundColor: "#1c1c1c", borderRadius: 8, paddingHorizontal: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#2d2d2d", height: 40 },
  buttonManual: { backgroundColor: "#222", paddingHorizontal: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#333" },
  buttonManualText: { color: "#6a4f33", fontWeight: "bold", fontSize: 12 },

  cardInfoAyuda: { backgroundColor: "#111", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#222" },
  ayudaTitle: { color: "#6a4f33", fontWeight: "bold", fontSize: 14, marginBottom: 8 },
  ayudaText: { color: "#888", fontSize: 13, marginBottom: 4, lineHeight: 18 },

  footerStatus: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#141414", paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: "#1f1f1f" },
  statusText: { color: "#eee", fontSize: 13, fontWeight: "500", marginLeft: 10, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotOrange: { backgroundColor: "#ff9900" },
  dotGreen: { backgroundColor: "#00ffaa" }
});
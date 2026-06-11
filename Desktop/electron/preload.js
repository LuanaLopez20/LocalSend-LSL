const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onDeviceFound: (callback) => {
    ipcRenderer.on("dispositivo-encontrado", (event, device) =>
      callback(device),
    );
  },
  onUploadProgress: (callback) => {
    ipcRenderer.on("progreso-carga", (event, data) => callback(data));
  },
  sendFile: (file, device) => {
    ipcRenderer.send("enviar-archivo", { file, device });
  },
});

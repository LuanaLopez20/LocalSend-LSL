const { contextBridge, ipcRenderer, webUtils } = require("electron");

console.log("✅ PRELOAD CARGADO");

contextBridge.exposeInMainWorld("electronAPI", {
  sendFile: (file, device) => {
    const filePath = webUtils.getPathForFile(file);

    console.log("📁 REAL PATH:", filePath);
    console.log("🎯 DEVICE:", device);

    ipcRenderer.send("send-file", filePath, device);
  },

  onDeviceFound: (callback) => {
    ipcRenderer.on("device-found", (_, device) => {
      callback(device);
    });
  },

  onUploadProgress: (callback) => {
    ipcRenderer.on("upload-progress", (_, data) => {
      callback(data);
    });
  },
});
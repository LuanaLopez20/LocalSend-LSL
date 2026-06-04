const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onDeviceFound: (callback) => {
    ipcRenderer.on("device-found", (_, device) => callback(device));
  },
  onUploadProgress: (callback) => {
    ipcRenderer.on("upload-progress", (_, data) => callback(data));
  },
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendFile: (filePath) => {
    ipcRenderer.send("send-file", filePath);
  },
});

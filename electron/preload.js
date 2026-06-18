const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("globalBridge", {
  getWsUrl: () => ipcRenderer.invoke("get-ws-url"),
  onFontSizeChange: (callback) => {
    ipcRenderer.on("font-size", (_event, delta) => callback(delta));
  },
});

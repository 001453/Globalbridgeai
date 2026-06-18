/**
 * GlobalBridge AI — Electron floating overlay window.
 * Always-on-top transparent subtitle display for video calls.
 */

const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require("electron");
const path = require("path");

const WS_URL = process.env.GB_WS_URL || "ws://localhost:8000/api/v1/ws/live";
const isDev = process.argv.includes("--dev");

let overlayWindow = null;
let controlWindow = null;

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
    width,
    height: 200,
    x: 0,
    y: height - 220,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));

  if (isDev) {
    overlayWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

app.whenReady().then(() => {
  createOverlayWindow();
  createControlWindow();

  // Toggle overlay visibility: Ctrl+Shift+O
  globalShortcut.register("CommandOrControl+Shift+O", () => {
    if (overlayWindow) {
      const visible = overlayWindow.isVisible();
      visible ? overlayWindow.hide() : overlayWindow.show();
    }
  });

  // Increase font: Ctrl+Shift+Up
  globalShortcut.register("CommandOrControl+Shift+Up", () => {
    overlayWindow?.webContents.send("font-size", 2);
  });

  globalShortcut.register("CommandOrControl+Shift+Down", () => {
    overlayWindow?.webContents.send("font-size", -2);
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-ws-url", () => WS_URL);

// src/main/window/WindowManager.js
const { BrowserWindow } = require("electron");
const path = require("path");
const waitOn = require("wait-on");

class WindowManager {
  constructor() {
    this.mainWindow = null;
    // Detectar modo: usa NODE_ENV si está definido, sino usa isPackaged
    const isPackaged = require("electron").app.isPackaged;
    const nodeEnv = process.env.NODE_ENV;

    // Si NODE_ENV está definido, úsalo; sino, usa isPackaged
    this.isDev = nodeEnv ? nodeEnv === 'development' : !isPackaged;
    this.serverURL = "http://localhost:8083";

    console.log("🔧 WindowManager inicializado:");
    console.log("  - isDev:", this.isDev);
    console.log("  - isPackaged:", isPackaged);
    console.log("  - NODE_ENV:", nodeEnv || 'not set');
  }

  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1300,
      height: 1000,
      minWidth: 1300,
      minHeight: 1000,
      show: false, // No mostrar hasta que esté listo
      icon: path.join(__dirname, "../../../public", "icono.ico"),
      backgroundColor: "#ffffff",
      webPreferences: {
        preload: path.join(__dirname, "../../../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.setupWindowEvents();
    await this.loadContent();

    return this.mainWindow;
  }

  async loadContent() {
    if (this.isDev) {
      await this.loadDevelopmentContent();
    } else {
      await this.loadProductionContent();
    }
  }

  async loadDevelopmentContent() {
    try {
      console.log("⏳ Esperando servidor webpack-dev-server...");
      await waitOn({ resources: [this.serverURL], timeout: 60000, interval: 500 });
      console.log("✅ Servidor detectado, esperando compilación...");

      // Esperar 3 segundos adicionales para que webpack termine de compilar
      await new Promise(resolve => setTimeout(resolve, 3000));

      await this.mainWindow.loadURL(this.serverURL);
      this.mainWindow.webContents.openDevTools();
    } catch (err) {
      const { dialog } = require("electron");
      console.error("❌ Error al conectar con servidor:", err);
      dialog.showErrorBox("Servidor Dev no disponible", "¿Ejecutaste `npm run dev`?");
    }
  }

  async loadProductionContent() {
    const fs = require("fs");
    const htmlPath = path.join(require("electron").app.getAppPath(), "dist", "index.html");

    console.log("Cargando HTML desde:", htmlPath);

    if (!fs.existsSync(htmlPath)) {
      const { dialog } = require("electron");
      dialog.showErrorBox("HTML no encontrado", htmlPath);
      return;
    }

    try {
      await this.mainWindow.loadFile(htmlPath);
      console.log("index.html cargado correctamente");

      // Forzar hash routing
      this.mainWindow.webContents.on("did-finish-load", () => {
        this.mainWindow.webContents.executeJavaScript(`
          if (!location.hash) {
            location.replace(location.href + "#/");
          }
        `);
      });
    } catch (err) {
      const { dialog } = require("electron");
      dialog.showErrorBox("Error al cargar HTML", err.message);
    }
  }

  setupWindowEvents() {
    // Capturar errores del renderer process
    this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levels = ['', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[RENDERER ${levels[level]}] ${message}`);
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Error al cargar página:');
      console.error('   - Error Code:', errorCode);
      console.error('   - Description:', errorDescription);
      console.error('   - URL:', validatedURL);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Página cargada exitosamente');
    });

    this.mainWindow.webContents.on('crashed', () => {
      console.error('❌ El renderer process crasheó');
    });

    this.mainWindow.webContents.on('unresponsive', () => {
      console.error('❌ El renderer process no responde');
    });

    // Mostrar ventana cuando esté lista
    this.mainWindow.once("ready-to-show", () => {
      console.log("✅ Ventana lista para mostrar");
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        this.mainWindow.setAlwaysOnTop(false);
      }, 500);
    });

    // Cleanup al cerrar
    this.mainWindow.on("closed", () => {
      console.log("🔴 Ventana cerrada");
      this.mainWindow = null;
    });
  }

  getMainWindow() {
    return this.mainWindow;
  }

  closeMainWindow() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
}

module.exports = WindowManager;
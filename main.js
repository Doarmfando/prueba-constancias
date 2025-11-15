// main.js - Refactorizado usando arquitectura MVC
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Cargar variables de entorno desde múltiples ubicaciones
// Esto es necesario para que funcione tanto en desarrollo como en producción
function loadEnvironment() {
  const isDev = !app.isPackaged;
  const envPaths = [];

  if (isDev) {
    // En desarrollo: buscar .env en la raíz del proyecto
    envPaths.push(path.join(__dirname, '.env'));
  } else {
    // En producción: buscar .env en varios lugares
    envPaths.push(
      // Junto al ejecutable
      path.join(process.resourcesPath, '.env'),
      // En extraResources
      path.join(process.resourcesPath, 'extraResources', '.env'),
      // En el directorio de la aplicación
      path.join(app.getPath('userData'), '.env'),
      // En el directorio actual
      path.join(process.cwd(), '.env')
    );
  }

  // Intentar cargar desde cada ubicación
  let loaded = false;
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`✅ Cargando variables de entorno desde: ${envPath}`);
      require('dotenv').config({ path: envPath });
      loaded = true;
      break;
    }
  }

  if (!loaded) {
    console.warn('⚠️ No se encontró archivo .env en ninguna ubicación:');
    envPaths.forEach(p => console.warn(`   - ${p}`));
  }

  return loaded;
}

// Cargar variables de entorno antes de cualquier otra importación
loadEnvironment();

// Importar servicios
const DatabaseService = require("./src/main/services/DatabaseService");
const ExcelService = require("./src/main/services/ExcelService");
const FileService = require("./src/main/services/FileService");

// Importar modelos
const RegistroModel = require("./src/main/models/RegistroModel");
const PersonaModel = require("./src/main/models/PersonaModel");
const ExpedienteModel = require("./src/main/models/ExpedienteModel");
const EstadoModel = require("./src/main/models/EstadoModel");
const UsuarioModel = require("./src/main/models/UsuarioModel");
const ProyectoModel = require("./src/main/models/ProyectoModel");
const AuditoriaModel = require("./src/main/models/AuditoriaModel");
const DocumentoPersonaModel = require("./src/main/models/DocumentoPersonaModel");

// Importar controladores
const RegistroController = require("./src/main/controllers/RegistroController");
const ExcelController = require("./src/main/controllers/ExcelController");
const FileController = require("./src/main/controllers/FileController");
const InformacionController = require("./src/main/controllers/InformacionController");
const AuthController = require("./src/main/controllers/AuthController");
const ProyectoController = require("./src/main/controllers/ProyectoController");
const AuditoriaController = require("./src/main/controllers/AuditoriaController");
const PersonaController = require("./src/main/controllers/PersonaController");
const DocumentoPersonaController = require("./src/main/controllers/DocumentoPersonaController");

// Importar gestores
const WindowManager = require("./src/main/window/WindowManager");
const IPCManager = require("./src/main/ipc/IPCManager");

class Application {
  constructor() {
    this.mainWindow = null;
    this.services = {};
    this.models = {};
    this.controllers = {};
    this.windowManager = null;
    this.ipcManager = null;
  }

  async initialize() {
    try {
      await this.setupErrorHandling();
      this.preventMultipleInstances();
      await this.initializeServices();
      this.initializeModels();
      this.initializeControllers();
      this.setupIPC();
      await this.createWindow();
      
      console.log("Aplicación inicializada correctamente");
    } catch (error) {
      console.error("Error al inicializar aplicación:", error);
      dialog.showErrorBox("Error crítico", error.message || "Error inesperado al inicializar.");
    }
  }

  async setupErrorHandling() {
    process.on("uncaughtException", (err) => {
      console.error("Error no capturado:", err);
      dialog.showErrorBox("Error crítico", err.message || "Error inesperado.");
    });
  }

  preventMultipleInstances() {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return false;
    }
    
    app.on("second-instance", () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });
    
    return true;
  }

  async initializeServices() {
    // Inicializar servicio de base de datos (ahora con Supabase)
    this.services.database = new DatabaseService();
    const clients = await this.services.database.connect();

    // Inicializar otros servicios
    this.services.excel = new ExcelService();
    this.services.file = new FileService();

    // Guardar referencias a ambos clientes de Supabase
    this.dbUser = clients.user;     // Cliente para operaciones de usuarios autenticados
    this.dbAdmin = clients.admin;   // Cliente para operaciones administrativas
    this.db = clients.admin;        // Legacy (compatibilidad)
  }

  initializeModels() {
    // La mayoría de modelos usan el cliente USER
    this.models.registro = new RegistroModel(this.dbUser);
    this.models.persona = new PersonaModel(this.dbUser);
    this.models.expediente = new ExpedienteModel(this.dbUser);
    this.models.estado = new EstadoModel(this.dbUser);
    this.models.proyecto = new ProyectoModel(this.dbUser);
    this.models.auditoria = new AuditoriaModel(this.dbUser);
    this.models.documentoPersona = new DocumentoPersonaModel(this.dbUser);

    // UsuarioModel usa cliente USER pero necesita referencia a ADMIN
    this.models.usuario = new UsuarioModel(this.dbUser);
    this.models.usuario.setAdminClient(this.dbAdmin);
  }

  initializeControllers() {
    this.controllers.registro = new RegistroController(this.models.registro, this.models.proyecto);
    this.controllers.excel = new ExcelController(
      this.services.excel,
      this.services.file,
      {
        persona: this.models.persona,
        expediente: this.models.expediente,
        registro: this.models.registro,
        estado: this.models.estado
      }
    );
    this.controllers.file = new FileController(this.services.file);
    this.controllers.informacion = new InformacionController(
      this.models.persona,
      this.models.expediente,
      this.models.registro
    );
    this.controllers.auth = new AuthController(
      this.models.usuario,
      this.models.auditoria
    );
    this.controllers.proyecto = new ProyectoController(
      this.models.proyecto,
      this.models.auditoria,
      this.models.registro
    );
    this.controllers.auditoria = new AuditoriaController(
      this.models.auditoria
    );
    this.controllers.persona = new PersonaController(
      this.models.persona
    );
    this.controllers.documentoPersona = new DocumentoPersonaController(
      this.models.documentoPersona,
      this.models.persona
    );
  }

  setupIPC() {
    this.ipcManager = new IPCManager();
    this.ipcManager.initialize(this.controllers, this.services);
  }

  async createWindow() {
    this.windowManager = new WindowManager();
    this.mainWindow = await this.windowManager.createMainWindow();
    
    // Configurar cleanup al cerrar
    this.mainWindow.on("closed", () => {
      this.cleanup();
    });
  }

  cleanup() {
    if (this.ipcManager) {
      this.ipcManager.cleanup();
    }
    
    if (this.services.database) {
      this.services.database.close();
    }
    
    this.mainWindow = null;
  }
}

// Inicialización de la aplicación
const application = new Application();

app.whenReady().then(() => {
  application.initialize();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    application.initialize();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Exportar para testing si es necesario
module.exports = Application;

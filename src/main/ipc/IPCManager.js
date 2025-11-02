// src/main/ipc/IPCManager.js
const { ipcMain } = require("electron");

// Importar todos los handlers IPC
const RegistroIPCHandler = require('./RegistroIPCHandler');
const ExcelIPCHandler = require('./ExcelIPCHandler');
const FileIPCHandler = require('./FileIPCHandler');
const InformacionIPCHandler = require('./InformacionIPCHandler');
const AuthIPCHandler = require('./AuthIPCHandler');
const ProyectoIPCHandler = require('./ProyectoIPCHandler');
const AuditoriaIPCHandler = require('./AuditoriaIPCHandler');
const DocumentoPersonaIPCHandler = require('./DocumentoPersonaIPCHandler');

class IPCManager {
  constructor() {
    this.handlers = new Map();
    this.initialized = false;
  }

  // Inicializar todos los handlers con sus controllers
  initialize(controllers, services) {
    if (this.initialized) {
      console.warn("IPCManager ya fue inicializado");
      return;
    }

    try {
      // Registrar handlers básicos de aplicación
      this.registerAppHandlers();

      // Inicializar handlers específicos
      this.initializeRegistroHandlers(controllers.registro);
      this.initializeExcelHandlers(controllers.excel);
      this.initializeFileHandlers(controllers.file);
      this.initializeInformacionHandlers(controllers.informacion);
      this.initializeAuthHandlers(controllers.auth);
      this.initializeProyectoHandlers(controllers.proyecto);
      this.initializeAuditoriaHandlers(controllers.auditoria);
      this.initializeDocumentoPersonaHandlers(controllers.documentoPersona);

      this.initialized = true;
      console.log("✅ IPCManager inicializado correctamente");
      this.logRegisteredHandlers();
    } catch (error) {
      console.error("❌ Error inicializando IPCManager:", error);
      throw error;
    }
  }

  // Handlers básicos de la aplicación
  registerAppHandlers() {
    // Cerrar aplicación
    ipcMain.handle("cerrar-app", () => {
      const { app } = require("electron");
      app.quit();
    });

    console.log("✅ Handlers básicos de aplicación registrados");
  }

  // Inicializar handlers de registros
  initializeRegistroHandlers(registroController) {
    if (!registroController) {
      throw new Error("RegistroController requerido");
    }

    const registroHandler = new RegistroIPCHandler(registroController);
    registroHandler.registerHandlers();
    registroHandler.registerValidatedHandlers();
    
    this.handlers.set('registro', registroHandler);
  }

  // Inicializar handlers de Excel
  initializeExcelHandlers(excelController) {
    if (!excelController) {
      throw new Error("ExcelController requerido");
    }

    const excelHandler = new ExcelIPCHandler(excelController);
    excelHandler.registerHandlers();
    excelHandler.registerAdvancedHandlers();
    
    this.handlers.set('excel', excelHandler);
  }

  // Inicializar handlers de archivos
  initializeFileHandlers(fileController) {
    if (!fileController) {
      throw new Error("FileController requerido");
    }

    const fileHandler = new FileIPCHandler(fileController);
    fileHandler.registerHandlers();
    fileHandler.registerAdvancedHandlers();
    
    this.handlers.set('file', fileHandler);
  }

  // Inicializar handlers de información
  initializeInformacionHandlers(informacionController) {
    if (!informacionController) {
      throw new Error("InformacionController requerido");
    }

    const informacionHandler = new InformacionIPCHandler(informacionController);
    informacionHandler.registerHandlers();
    informacionHandler.registerAdvancedHandlers();

    this.handlers.set('informacion', informacionHandler);
  }

  // Inicializar handlers de autenticación
  initializeAuthHandlers(authController) {
    if (!authController) {
      throw new Error("AuthController requerido");
    }

    const authHandler = new AuthIPCHandler(authController);
    authHandler.registerHandlers();
    authHandler.registerAdminHandlers();

    this.handlers.set('auth', authHandler);
  }

  // Inicializar handlers de proyectos
  initializeProyectoHandlers(proyectoController) {
    if (!proyectoController) {
      throw new Error("ProyectoController requerido");
    }

    const proyectoHandler = new ProyectoIPCHandler(proyectoController);
    proyectoHandler.registerHandlers();
    proyectoHandler.registerAdvancedHandlers();
    proyectoHandler.registerAdminHandlers();

    this.handlers.set('proyecto', proyectoHandler);
  }

  // Inicializar handlers de auditoría
  initializeAuditoriaHandlers(auditoriaController) {
    if (!auditoriaController) {
      throw new Error("AuditoriaController requerido");
    }

    const auditoriaHandler = new AuditoriaIPCHandler(auditoriaController);
    auditoriaHandler.registerHandlers();

    this.handlers.set('auditoria', auditoriaHandler);
  }

  // Inicializar handlers de documentos de persona
  initializeDocumentoPersonaHandlers(documentoPersonaController) {
    if (!documentoPersonaController) {
      throw new Error("DocumentoPersonaController requerido");
    }

    const documentoPersonaHandler = new DocumentoPersonaIPCHandler(documentoPersonaController);
    documentoPersonaHandler.registerHandlers();

    this.handlers.set('documentoPersona', documentoPersonaHandler);
  }

  // Listar todos los handlers registrados
  logRegisteredHandlers() {
    console.log("\n📋 Handlers IPC registrados:");
    
    let totalHandlers = 0;
    
    for (const [categoria, handler] of this.handlers.entries()) {
      if (typeof handler.listHandlers === 'function') {
        console.log(`\n📁 ${categoria.toUpperCase()}:`);
        const handlerList = handler.listHandlers();
        totalHandlers += handlerList.length;
      }
    }

    // Contar handlers básicos
    const basicHandlers = ["cerrar-app"];
    totalHandlers += basicHandlers.length;

    console.log(`\n✅ Total de handlers registrados: ${totalHandlers}`);
    console.log("🔗 IPCManager listo para recibir comunicaciones del frontend\n");
  }

  // Limpiar todos los handlers (útil para testing o reinicio)
  cleanup() {
    try {
      // Limpiar handlers específicos
      for (const [categoria, handler] of this.handlers.entries()) {
        if (typeof handler.removeAllHandlers === 'function') {
          handler.removeAllHandlers();
        }
      }

      // Limpiar handlers básicos
      ipcMain.removeHandler("cerrar-app");

      this.handlers.clear();
      this.initialized = false;

      console.log("🧹 IPCManager limpiado correctamente");
    } catch (error) {
      console.error("❌ Error limpiando IPCManager:", error);
    }
  }

  // Verificar estado de inicialización
  isInitialized() {
    return this.initialized;
  }

  // Obtener handler específico (útil para testing)
  getHandler(categoria) {
    return this.handlers.get(categoria);
  }

  // Verificar si un canal específico está registrado
  isChannelRegistered(channel) {
    // Esta verificación requeriría extender los handlers base
    // para llevar registro de los canales registrados
    return ipcMain.listenerCount(channel) > 0;
  }

  // Estadísticas de uso (si se implementa logging)
  getStats() {
    return {
      initialized: this.initialized,
      totalCategories: this.handlers.size,
      categories: Array.from(this.handlers.keys()),
      // Aquí se podrían agregar estadísticas de uso si se implementa logging
    };
  }
}

module.exports = IPCManager;
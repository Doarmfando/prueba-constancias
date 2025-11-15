// src/main/ipc/BaseIPCHandler.js
const { ipcMain } = require("electron");

class BaseIPCHandler {
  constructor() {
    this.handlers = new Map();
  }

  // Registrar un handler IPC
  handle(channel, controller, method) {
    if (this.handlers.has(channel)) {
      console.warn(`Handler para '${channel}' ya existe. Será sobrescrito.`);
    }

    this.handlers.set(channel, { controller, method });

    ipcMain.handle(channel, async (event, ...args) => {
      try {
        console.log(`IPC: ${channel} - Iniciando`);

        const result = await controller[method](...args);

        console.log(`IPC: ${channel} - Completado exitosamente`);
        return result;
      } catch (error) {
        console.error(`IPC Error en ${channel}:`, error.message);

        // Retornar error estructurado
        return {
          success: false,
          error: error.message,
          channel
        };
      }
    });
  }

  // Registrar un handler IPC con función personalizada
  handleCustom(channel, customFunction) {
    if (this.handlers.has(channel)) {
      console.warn(`Handler para '${channel}' ya existe. Será sobrescrito.`);
    }

    this.handlers.set(channel, { customFunction, type: 'custom' });

    ipcMain.handle(channel, async (event, ...args) => {
      try {
        console.log(`IPC Custom: ${channel} - Iniciando con args:`, args);

        const result = await customFunction(...args);

        console.log(`IPC Custom: ${channel} - Completado exitosamente`);
        return result;
      } catch (error) {
        console.error(`IPC Custom Error en ${channel}:`, error.message);

        // Retornar error estructurado
        return {
          success: false,
          error: error.message,
          channel
        };
      }
    });
  }

  // Registrar un listener IPC (para eventos sin respuesta)
  on(channel, controller, method) {
    if (this.handlers.has(channel)) {
      console.warn(`Listener para '${channel}' ya existe. Será sobrescrito.`);
    }

    this.handlers.set(channel, { controller, method, type: 'listener' });

    ipcMain.on(channel, async (event, ...args) => {
      try {
        console.log(`IPC Listener: ${channel} - Ejecutando`);
        await controller[method](event, ...args);
      } catch (error) {
        console.error(`IPC Listener Error en ${channel}:`, error.message);
      }
    });
  }

  // Remover handler
  removeHandler(channel) {
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel);
      this.handlers.delete(channel);
      console.log(`Handler '${channel}' removido`);
    }
  }

  // Remover todos los handlers registrados
  removeAllHandlers() {
    for (const channel of this.handlers.keys()) {
      this.removeHandler(channel);
    }
    console.log("Todos los handlers IPC removidos");
  }

  // Listar handlers registrados
  listHandlers() {
    const handlerList = Array.from(this.handlers.entries()).map(([channel, info]) => ({
      channel,
      controller: info.controller ? info.controller.constructor.name : (info.type === 'custom' ? 'CustomFunction' : 'Unknown'),
      method: info.method || 'custom',
      type: info.type || 'handle'
    }));

    console.table(handlerList);
    return handlerList;
  }

  // Validar que el controller tenga el método
  validateControllerMethod(controller, method) {
    if (!controller || typeof controller[method] !== 'function') {
      throw new Error(`Controller no tiene el método '${method}'`);
    }
  }

  // Registrar múltiples handlers de una vez
  registerHandlers(handlerDefinitions) {
    for (const definition of handlerDefinitions) {
      const { channel, controller, method, type = 'handle' } = definition;
      
      this.validateControllerMethod(controller, method);
      
      if (type === 'listener') {
        this.on(channel, controller, method);
      } else {
        this.handle(channel, controller, method);
      }
    }
  }
}

module.exports = BaseIPCHandler;
const { ipcMain } = require("electron");

class AuditoriaIPCHandler {
  constructor(auditoriaController) {
    this.auditoriaController = auditoriaController;
    this.registeredChannels = [];
  }

  registerHandlers() {
    console.log("📊 Registrando handlers de auditoría...");

    // Obtener historial de auditoría
    ipcMain.handle("auditoria-obtener-historial", async (event, filtros) => {
      try {
        const { limite, offset, filtros: filtrosAdicionales, usuario } = filtros || {};
        // Temporalmente permitir acceso sin verificar usuario admin
        const usuarioTemporal = usuario || { id: 1, rol: 'administrador' };
        return await this.auditoriaController.obtenerHistorial(usuarioTemporal, limite || 50, offset || 0, filtrosAdicionales || {});
      } catch (error) {
        console.error("Error en auditoria-obtener-historial:", error);
        return { success: false, error: error.message };
      }
    });

    // Obtener estadísticas de auditoría
    ipcMain.handle("auditoria-obtener-estadisticas", async (event, { usuario } = {}) => {
      try {
        const usuarioTemporal = usuario || { id: 1, rol: 'administrador' };
        return await this.auditoriaController.obtenerEstadisticas(usuarioTemporal);
      } catch (error) {
        console.error("Error en auditoria-obtener-estadisticas:", error);
        return { success: false, error: error.message };
      }
    });

    // Exportar historial
    ipcMain.handle("auditoria-exportar-historial", async (event, { usuario, filtros }) => {
      try {
        return await this.auditoriaController.exportarHistorial(usuario, filtros);
      } catch (error) {
        console.error("Error en auditoria-exportar-historial:", error);
        return { success: false, error: error.message };
      }
    });

    // Limpiar historial antiguo
    ipcMain.handle("auditoria-limpiar-historial", async (event, { usuario, diasAntiguedad }) => {
      try {
        return await this.auditoriaController.limpiarHistorialAntiguo(usuario, diasAntiguedad);
      } catch (error) {
        console.error("Error en auditoria-limpiar-historial:", error);
        return { success: false, error: error.message };
      }
    });

    // Registrar logout (sin exigir rol admin)
    ipcMain.handle("auditoria-registrar-logout", async (event, usuario) => {
      try {
        return await this.auditoriaController.registrarLogout(usuario);
      } catch (error) {
        console.error("Error en auditoria-registrar-logout:", error);
        return { success: false, error: error.message };
      }
    });

    this.registeredChannels = [
      "auditoria-obtener-historial",
      "auditoria-obtener-estadisticas",
      "auditoria-exportar-historial",
      "auditoria-limpiar-historial"
    ];

    console.log("✅ Handlers de auditoría registrados");
  }

  listHandlers() {
    return this.registeredChannels.map(channel => `  • ${channel}`);
  }

  removeAllHandlers() {
    this.registeredChannels.forEach(channel => {
      ipcMain.removeHandler(channel);
    });
    this.registeredChannels = [];
    console.log("🧹 Handlers de auditoría removidos");
  }
}

module.exports = AuditoriaIPCHandler;

const { ipcMain } = require("electron");

class AuthIPCHandler {
  constructor(authController) {
    this.authController = authController;
    this.registeredChannels = [];
  }

  registerHandlers() {
    console.log("🔐 Registrando handlers de autenticación...");

    // Login
    ipcMain.handle("auth-login", async (event, { nombre_usuario, password }) => {
      try {
        return await this.authController.login(nombre_usuario, password);
      } catch (error) {
        console.error("Error en auth-login:", error);
        return { success: false, error: error.message };
      }
    });

    // Verificar sesión
    ipcMain.handle("auth-verificar-sesion", async (event, { usuarioId }) => {
      try {
        return await this.authController.verificarSesion(usuarioId);
      } catch (error) {
        console.error("Error en auth-verificar-sesion:", error);
        return { success: false, error: error.message };
      }
    });

    // Obtener perfil
    ipcMain.handle("auth-obtener-perfil", async (event, { usuarioId }) => {
      try {
        return await this.authController.obtenerPerfil(usuarioId);
      } catch (error) {
        console.error("Error en auth-obtener-perfil:", error);
        return { success: false, error: error.message };
      }
    });

    // Cambiar contraseña
    ipcMain.handle("auth-cambiar-password", async (event, { id, passwordAnterior, passwordNuevo, usuario }) => {
      try {
        return await this.authController.cambiarPassword(id, passwordAnterior, passwordNuevo, usuario);
      } catch (error) {
        console.error("Error en auth-cambiar-password:", error);
        return { success: false, error: error.message };
      }
    });

    this.registeredChannels = [
      "auth-login",
      "auth-verificar-sesion",
      "auth-obtener-perfil",
      "auth-cambiar-password"
    ];

    console.log("✅ Handlers de autenticación registrados");
  }

  registerAdminHandlers() {
    console.log("👥 Registrando handlers de administración de usuarios...");

    // Crear usuario (solo admin)
    ipcMain.handle("auth-crear-usuario", async (event, { datosUsuario, usuario }) => {
      try {
        return await this.authController.crearUsuario(datosUsuario, usuario);
      } catch (error) {
        console.error("Error en auth-crear-usuario:", error);
        return { success: false, error: error.message };
      }
    });

    // Listar usuarios (solo admin)
    ipcMain.handle("auth-listar-usuarios", async (event, { usuario }) => {
      try {
        return await this.authController.listarUsuarios(usuario);
      } catch (error) {
        console.error("Error en auth-listar-usuarios:", error);
        return { success: false, error: error.message };
      }
    });

    // Actualizar usuario
    ipcMain.handle("auth-actualizar-usuario", async (event, { id, datos, usuario }) => {
      try {
        return await this.authController.actualizarUsuario(id, datos, usuario);
      } catch (error) {
        console.error("Error en auth-actualizar-usuario:", error);
        return { success: false, error: error.message };
      }
    });

    // Desactivar usuario (solo admin)
    ipcMain.handle("auth-desactivar-usuario", async (event, { id, usuario }) => {
      try {
        return await this.authController.desactivarUsuario(id, usuario);
      } catch (error) {
        console.error("Error en auth-desactivar-usuario:", error);
        return { success: false, error: error.message };
      }
    });

    // Obtener estadísticas (solo admin)
    ipcMain.handle("auth-obtener-estadisticas", async (event, { usuario }) => {
      try {
        return await this.authController.obtenerEstadisticas(usuario);
      } catch (error) {
        console.error("Error en auth-obtener-estadisticas:", error);
        return { success: false, error: error.message };
      }
    });

    const adminChannels = [
      "auth-crear-usuario",
      "auth-listar-usuarios",
      "auth-actualizar-usuario",
      "auth-desactivar-usuario",
      "auth-obtener-estadisticas"
    ];

    this.registeredChannels.push(...adminChannels);
    console.log("✅ Handlers de administración registrados");
  }

  listHandlers() {
    return this.registeredChannels.map(channel => `  • ${channel}`);
  }

  removeAllHandlers() {
    this.registeredChannels.forEach(channel => {
      ipcMain.removeHandler(channel);
    });
    this.registeredChannels = [];
    console.log("🧹 Handlers de autenticación removidos");
  }
}

module.exports = AuthIPCHandler;

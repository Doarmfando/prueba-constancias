const BaseController = require('./BaseController');

class AuditoriaController extends BaseController {
  constructor(auditoriaModel) {
    super();
    this.auditoriaModel = auditoriaModel;
  }

  async obtenerHistorial(usuario, limite = 50, offset = 0, filtros = {}) {
    try {
      if (!this.verificarEsAdmin(usuario)) {
        throw new Error("Acceso denegado. Solo administradores pueden ver auditorías.");
      }

      const { busqueda, usuario: filtroUsuario, accion } = filtros;

      const logs = await this.auditoriaModel.obtenerHistorial({
        limite,
        offset,
        busqueda,
        usuario: filtroUsuario,
        accion
      });

      const total = await this.auditoriaModel.contarTotal({
        busqueda,
        usuario: filtroUsuario,
        accion
      });

      return {
        success: true,
        logs,
        total,
        pagina: Math.floor(offset / limite) + 1,
        totalPaginas: Math.ceil(total / limite)
      };
    } catch (error) {
      console.error('Error obteniendo historial de auditoría:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async obtenerEstadisticas(usuario) {
    try {
      if (!this.verificarEsAdmin(usuario)) {
        throw new Error("Acceso denegado. Solo administradores pueden ver estadísticas.");
      }

      const estadisticas = await this.auditoriaModel.obtenerEstadisticas();

      return {
        success: true,
        estadisticas
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async limpiarHistorialAntiguo(usuario, diasAntiguedad = 365) {
    try {
      if (!this.verificarEsAdmin(usuario)) {
        throw new Error("Acceso denegado. Solo administradores pueden limpiar auditorías.");
      }

      const resultado = await this.auditoriaModel.limpiarHistorialAntiguo(diasAntiguedad);

      if (resultado.success) {
        await this.auditoriaModel.registrarAccion(
          usuario.id,
          'limpiar',
          'auditoria',
          null,
          {
            dias_antiguedad: diasAntiguedad,
            registros_eliminados: resultado.registrosEliminados
          }
        );
      }

      return resultado;
    } catch (error) {
      console.error('Error limpiando historial de auditoría:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exportarHistorial(usuario, filtros = {}) {
    try {
      if (!this.verificarEsAdmin(usuario)) {
        throw new Error("Acceso denegado. Solo administradores pueden exportar auditorías.");
      }

      const logs = await this.auditoriaModel.obtenerHistorialCompleto(filtros);

      await this.auditoriaModel.registrarAccion(
        usuario.id,
        'exportar',
        'auditoria',
        null,
        {
          total_registros: logs.length,
          filtros_aplicados: filtros
        }
      );

      return {
        success: true,
        message: "Funcionalidad de exportación en desarrollo",
        logs
      };
    } catch (error) {
      console.error('Error exportando historial de auditoría:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async registrarLogout(usuario) {
    try {
      if (!usuario?.id) {
        return { success: false, error: "Usuario requerido para registrar logout" };
      }

      await this.auditoriaModel.registrarAccion({
        usuario_id: usuario.id,
        accion: 'logout',
        tabla_afectada: 'usuarios',
        registro_id: usuario.id,
        detalles: { fecha_logout: new Date().toISOString() }
      });

      return { success: true };
    } catch (error) {
      console.error('Error registrando logout en auditoría:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuditoriaController;

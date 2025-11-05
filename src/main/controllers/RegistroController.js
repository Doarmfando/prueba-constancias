// src/main/controllers/RegistroController.js
const BaseController = require('./BaseController');

class RegistroController extends BaseController {
  constructor(registroModel) {
    super(registroModel);
  }

  // Obtener todos los registros activos
  async obtenerRegistros() {
    try {
      const registros = await this.model.obtenerTodos();
      return registros;
    } catch (error) {
      this.handleError(error, "Error obteniendo registros");
    }
  }

  // Obtener registros en papelera
  async obtenerPapeleria() {
    try {
      const papeleria = await this.model.obtenerEliminados();
      return papeleria;
    } catch (error) {
      this.handleError(error, "Error obteniendo papeleria");
    }
  }

  // Obtener registros por proyecto
  async obtenerRegistrosPorProyecto(proyectoId) {
    try {
      console.log(`🔍 Obteniendo registros para proyecto ID: ${proyectoId}`);

      const registros = await this.model.obtenerTodos(proyectoId);
      const registrosEliminados = await this.model.obtenerEliminados(proyectoId);

      console.log(`📊 Encontrados ${registros?.length || 0} registros activos y ${registrosEliminados?.length || 0} eliminados`);

      return {
        success: true,
        registros: registros || [],
        registrosEliminados: registrosEliminados || []
      };
    } catch (error) {
      console.error(`❌ Error obteniendo registros para proyecto ${proyectoId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Agregar nuevo registro
  async agregarRegistro(datos) {
    try {
      const datosSanitizados = this.sanitizeInput(datos);
      const resultado = await this.model.agregar(datosSanitizados);

      // Crear una respuesta serializable
      const respuesta = {
        success: true,
        registro: {
          id: resultado?.id,
          persona_id: resultado?.persona_id,
          expediente_id: resultado?.expediente_id,
          estado_id: resultado?.estado_id,
          nombre: resultado?.nombre,
          numero: resultado?.numero,
          dni: resultado?.dni,
          expediente: resultado?.expediente,
          estado: resultado?.estado,
          fecha_registro: resultado?.fecha_registro,
          fecha_en_caja: resultado?.fecha_en_caja
        }
      };

      // Verificar si hay advertencias por campos faltantes
      const camposFaltantes = this.verificarCamposFaltantes(datosSanitizados);
      if (camposFaltantes.length > 0) {
        respuesta.advertencia = `Guardado con campos incompletos: ${camposFaltantes.join(", ")}`;
      }

      return respuesta;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar registro existente
  async actualizarRegistro(datos) {
    try {
      this.validateRequired(datos, ['id']);
      const datosSanitizados = this.sanitizeInput(datos);
      const resultado = await this.model.actualizar(datosSanitizados);

      // Retornar en el mismo formato que agregarRegistro
      return {
        success: true,
        registro: resultado
      };
    } catch (error) {
      this.handleError(error, "Error actualizando registro");
    }
  }

  // Mover registro a papelera
  async moverAPapelera(id) {
    try {
      this.validateRequired({ id }, ['id']);
      const resultado = await this.model.moverAPapelera(id);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error moviendo a papelera");
    }
  }

  // Mover múltiples registros a papelera
  async moverMultipleAPapelera(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs válidos");
      }
      
      const resultado = await this.model.moverMultipleAPapelera(ids);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error moviendo múltiples registros a papelera");
    }
  }

  // Restaurar registro desde papelera
  async restaurarRegistro(id) {
    try {
      this.validateRequired({ id }, ['id']);
      const resultado = await this.model.restaurar(id);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error restaurando registro");
    }
  }

  // Restaurar múltiples registros
  async restaurarMultiple(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs válidos");
      }
      
      const resultado = await this.model.restaurarMultiple(ids);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error restaurando múltiples registros");
    }
  }

  // Eliminar registro permanentemente
  async eliminarPermanentemente(id) {
    try {
      this.validateRequired({ id }, ['id']);
      const resultado = await this.model.eliminarPermanentemente(id);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error eliminando registro permanentemente");
    }
  }

  // Eliminar múltiples registros permanentemente
  async eliminarMultiple(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs válidos");
      }

      // Eliminar uno por uno para mantener la lógica de limpieza
      const resultados = [];
      for (const id of ids) {
        try {
          const resultado = await this.model.eliminarPermanentemente(id);
          resultados.push({ id, success: true, ...resultado });
        } catch (error) {
          resultados.push({ id, success: false, error: error.message });
        }
      }

      const exitosos = resultados.filter(r => r.success).length;
      const fallidos = resultados.filter(r => !r.success).length;

      return {
        message: `${exitosos} registros eliminados correctamente${fallidos > 0 ? `, ${fallidos} fallaron` : ''}`,
        details: resultados
      };
    } catch (error) {
      this.handleError(error, "Error eliminando múltiples registros");
    }
  }

  // Buscar registros por DNI
  async buscarPorDni(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      // Validar formato de DNI
      if (!/^\d{8}$/.test(dni.trim())) {
        throw new Error("El DNI debe tener exactamente 8 dígitos");
      }
      
      const resultado = await this.model.buscarPorDni(dni.trim());
      return resultado;
    } catch (error) {
      this.handleError(error, "Error buscando por DNI");
    }
  }

  // Mover todos los registros de un DNI a papelera
  async moverDniCompletoAPapelera(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      if (!/^\d{8}$/.test(dni.trim())) {
        throw new Error("El DNI debe tener exactamente 8 dígitos");
      }
      
      const resultado = await this.model.moverDniCompletoPapelera(dni.trim());
      return resultado;
    } catch (error) {
      this.handleError(error, "Error moviendo registros del DNI a papelera");
    }
  }

  // Vaciar todos los registros
  async vaciarTodos() {
    try {
      const resultado = await this.model.vaciarTodos();
      return resultado;
    } catch (error) {
      this.handleError(error, "Error vaciando registros");
    }
  }

  // Obtener estadísticas del dashboard
  async obtenerEstadisticas(params = {}) {
    try {
      const { tipo = "registro", anio = "Todo" } = params;

      // Obtener estadísticas básicas y detalladas
      const resultado = await this.calcularEstadisticas(tipo, anio);

      // Agregar estadísticas adicionales para el dashboard
      const hoy = new Date().toISOString().split('T')[0];
      const registrosHoy = await this.model.executeQuery(`
        SELECT COUNT(*) as total
        FROM registros
        WHERE DATE(fecha_registro) = ? AND eliminado = 0
      `, [hoy]);

      return {
        ...resultado,
        hoy: registrosHoy[0]?.total || 0
      };
    } catch (error) {
      this.handleError(error, "Error obteniendo estadísticas");
    }
  }

  // Obtener años disponibles para filtros
  async obtenerFechasDisponibles(tipo = "registro") {
    try {
      const resultado = await this.model.obtenerFechasDisponibles(tipo);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error obteniendo fechas disponibles");
    }
  }

  // Métodos auxiliares privados

  verificarCamposFaltantes(datos) {
    const { nombre, numero, dni, expediente } = datos;
    const faltantes = [];
    
    if (!nombre || nombre === "---") faltantes.push("nombre");
    if (!numero || numero === "---") faltantes.push("número");
    if (!dni || dni === "---") faltantes.push("DNI");
    if (!expediente || expediente === "" || expediente === "---") faltantes.push("expediente");
    
    return faltantes;
  }

  async calcularEstadisticas(tipo, anio) {
    // Esta lógica debería estar en el modelo o en un servicio de estadísticas
    // La mantenemos aquí temporalmente para compatibilidad
    const campoFecha = tipo === "solicitud" ? "expedientes.fecha_solicitud" : "registros.fecha_registro";
    const whereFecha = anio !== "Todo" ? `AND strftime('%Y', ${campoFecha}) = ?` : "";
    
    const query = `
      SELECT estados.nombre, COUNT(*) as total
      FROM registros
      INNER JOIN estados ON registros.estado_id = estados.id
      LEFT JOIN expedientes ON registros.expediente_id = expedientes.id
      WHERE registros.eliminado = 0
      ${whereFecha}
      GROUP BY estados.nombre
    `;
    
    const params = anio !== "Todo" ? [anio] : [];
    
    try {
      const rows = await this.model.executeQuery(query, params);
      
      const conteo = {
        Recibido: 0,
        "En Caja": 0,
        Entregado: 0,
        Tesoreria: 0,
      };

      for (const row of rows) {
        if (conteo.hasOwnProperty(row.nombre)) {
          conteo[row.nombre] = row.total;
        }
      }

      const total = Object.values(conteo).reduce((a, b) => a + b, 0);
      return { success: true, total, ...conteo };
    } catch (error) {
      return { success: false };
    }
  }
}

module.exports = RegistroController;
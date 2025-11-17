// src/main/controllers/RegistroController.js
const BaseController = require('./BaseController');

class RegistroController extends BaseController {
  constructor(registroModel, proyectoModel = null) {
    super(registroModel);
    this.proyectoModel = proyectoModel;
  }

  async verificarPermisoEdicion(proyectoId, usuario) {
    // Si no hay usuario, permitir (modo desarrollo)
    if (!usuario || !usuario.id) {
      return true;
    }

    // Administradores pueden editar todo
    if (usuario.rol === 'administrador') {
      return true;
    }

    // Si no hay proyectoModel, permitir
    if (!this.proyectoModel) {
      return true;
    }

    try {
      // Obtener el proyecto para verificar si es público o privado
      const proyecto = await this.proyectoModel.obtenerPorId(proyectoId);

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      // Proyectos públicos: todos los usuarios pueden editar
      if (proyecto.es_publico === true) {
        return true;
      }

      // Proyectos privados: solo el creador o admin
      const usuarioId = typeof usuario.id === 'string' ? parseInt(usuario.id, 10) : usuario.id;
      if (proyecto.usuario_creador_id === usuarioId) {
        return true;
      }

      // Si llegamos aquí, no tiene permisos
      throw new Error('No tienes permisos para editar registros en este proyecto privado');
    } catch (error) {
      throw error;
    }
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

      const registros = await this.model.obtenerTodos(proyectoId);
      const registrosEliminados = await this.model.obtenerEliminados(proyectoId);


      return {
        success: true,
        registros: registros || [],
        registrosEliminados: registrosEliminados || []
      };
    } catch (error) {
      console.error(`âŒ Error obteniendo registros para proyecto ${proyectoId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Agregar nuevo registro
  async agregarRegistro(payload) {
    try {
      const datos = payload?.datos || payload;
      const usuario = payload?.usuario || null;
      const datosSanitizados = this.sanitizeInput(datos);


      // Mapear nombres del frontend a nombres del backend
      // fecha_registro del frontend -> fecha_solicitud del backend (expedientes)
      const datosMapeados = {
        proyecto_id: datosSanitizados.proyecto_id,
        nombre: datosSanitizados.nombre,
        dni: datosSanitizados.dni,
        numero: datosSanitizados.numero,
        expediente_codigo: datosSanitizados.expediente || datosSanitizados.expediente_codigo || '',
        fecha_solicitud: datosSanitizados.fecha_registro || datosSanitizados.fecha_solicitud || new Date().toISOString().split('T')[0],
        fecha_entrega: datosSanitizados.fecha_entrega,
        observacion: datosSanitizados.Observación || datosSanitizados.observacion || '',
        estado_id: datosSanitizados.estado_id, // Será buscado si viene como string
        usuario_creador_id: datosSanitizados.usuario_creador_id,
        fecha_en_caja: datosSanitizados.fecha_en_caja || null
      };

      // Si estado viene como string (nombre), buscar el ID
      if (!datosMapeados.estado_id && datosSanitizados.estado) {
        // Obtener EstadoModel a través del controller
        const EstadoModel = require('../models/EstadoModel');
        const estadoModel = new EstadoModel(this.model.db);
        const estadoEncontrado = await estadoModel.buscarPorNombre(datosSanitizados.estado);
        if (estadoEncontrado) {
          datosMapeados.estado_id = estadoEncontrado.id;
        }
      }

      if (datosMapeados?.proyecto_id) {
        await this.verificarPermisoEdicion(datosMapeados.proyecto_id, usuario);
      }
      const resultado = await this.model.agregar(datosMapeados);

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
  async actualizarRegistro(payload) {
    try {
      const datos = payload?.datos || payload;
      const usuario = payload?.usuario || null;
      this.validateRequired(datos, ['id']);
      const datosSanitizados = this.sanitizeInput(datos);

      // Mapear datos del frontend al formato del backend
      const datosMapeados = {
        id: datosSanitizados.id,
        nombre: datosSanitizados.nombre,
        dni: datosSanitizados.dni,
        numero: datosSanitizados.numero,
        expediente_codigo: datosSanitizados.expediente || datosSanitizados.expediente_codigo,
        fecha_registro: datosSanitizados.fecha_registro, // Para actualizar expediente.fecha_solicitud
        observacion: datosSanitizados.Observación || datosSanitizados.observacion,
        estado_id: datosSanitizados.estado_id,
        fecha_en_caja: datosSanitizados.fecha_en_caja,
        persona_id: datosSanitizados.persona_id,
        expediente_id: datosSanitizados.expediente_id
      };

      console.log('📝 [RegistroController] Datos sanitizados recibidos:', JSON.stringify(datosSanitizados, null, 2));
      console.log('📝 [RegistroController] Datos mapeados:', JSON.stringify(datosMapeados, null, 2));

      // Si estado viene como string (nombre), buscar el ID
      if (!datosMapeados.estado_id && datosSanitizados.estado) {
        console.log('🔍 [RegistroController] Buscando estado por nombre:', datosSanitizados.estado);
        const EstadoModel = require('../models/EstadoModel');
        const estadoModel = new EstadoModel(this.model.db);
        const estadoEncontrado = await estadoModel.buscarPorNombre(datosSanitizados.estado);
        if (estadoEncontrado) {
          console.log('✅ [RegistroController] Estado encontrado:', estadoEncontrado);
          datosMapeados.estado_id = estadoEncontrado.id;
        } else {
          console.log('❌ [RegistroController] Estado NO encontrado');
        }
      } else {
        console.log('ℹ️ [RegistroController] Estado ya viene como ID:', datosMapeados.estado_id);
      }

      // Obtener el registro para verificar permisos
      const reg = await this.model.getById(datosMapeados.id);
      if (reg?.proyecto_id) {
        await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
      }

      const resultado = await this.model.actualizar(datosMapeados);

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
  async moverAPapelera(payload) {
    try {
      const id = typeof payload === 'object' ? payload.id : payload;
      const usuario = typeof payload === 'object' ? payload.usuario : null;
      this.validateRequired({ id }, ['id']);
      const reg = await this.model.getById(id);
      if (reg?.proyecto_id) {
        await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
      }
      const usuarioId = usuario?.id || null;
      const resultado = await this.model.moverAPapelera(id, usuarioId);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error moviendo a papelera");
    }
  }

  // Mover mÃºltiples registros a papelera
  async moverMultipleAPapelera(payload) {
    try {
      const ids = Array.isArray(payload) ? payload : payload?.ids;
      const usuario = Array.isArray(payload) ? null : payload?.usuario;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs vÃ¡lidos");
      }
      // Validar permisos por cada registro
      for (const id of ids) {
        const reg = await this.model.getById(id);
        if (reg?.proyecto_id) {
          await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
        }
      }
      const resultado = await this.model.moverMultipleAPapelera(ids);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error moviendo mÃºltiples registros a papelera");
    }
  }

  // Restaurar registro desde papelera
  async restaurarRegistro(payload) {
    try {
      const id = typeof payload === 'object' ? payload.id : payload;
      const usuario = typeof payload === 'object' ? payload.usuario : null;
      this.validateRequired({ id }, ['id']);
      const reg = await this.model.getById(id);
      if (reg?.proyecto_id) {
        await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
      }
      const usuarioId = usuario?.id || null;
      const resultado = await this.model.restaurar(id, usuarioId);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error restaurando registro");
    }
  }

  // Restaurar mÃºltiples registros
  async restaurarMultiple(payload) {
    try {
      const ids = Array.isArray(payload) ? payload : payload?.ids;
      const usuario = Array.isArray(payload) ? null : payload?.usuario;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs vÃ¡lidos");
      }
      for (const id of ids) {
        const reg = await this.model.getById(id);
        if (reg?.proyecto_id) {
          await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
        }
      }
      const resultado = await this.model.restaurarMultiple(ids);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error restaurando mÃºltiples registros");
    }
  }

  // Eliminar registro permanentemente
  async eliminarPermanentemente(payload) {
    try {
      const id = typeof payload === 'object' ? payload.id : payload;
      const usuario = typeof payload === 'object' ? payload.usuario : null;
      this.validateRequired({ id }, ['id']);
      const reg = await this.model.getById(id);
      if (reg?.proyecto_id) {
        await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
      }
      const resultado = await this.model.eliminarPermanentemente(id);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error eliminando registro permanentemente");
    }
  }

  // Eliminar mÃºltiples registros permanentemente
  async eliminarMultiple(payload) {
    try {
      const ids = Array.isArray(payload) ? payload : payload?.ids;
      const usuario = Array.isArray(payload) ? null : payload?.usuario;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("No se proporcionaron IDs vÃ¡lidos");
      }

      // Eliminar uno por uno para mantener la lÃ³gica de limpieza
      const resultados = [];
      for (const id of ids) {
        try {
          const reg = await this.model.getById(id);
          if (reg?.proyecto_id) {
            await this.verificarPermisoEdicion(reg.proyecto_id, usuario);
          }
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
      this.handleError(error, "Error eliminando mÃºltiples registros");
    }
  }

  // Buscar registros por DNI
  async buscarPorDni(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      // Validar formato de DNI
      if (!/^\d{8}$/.test(dni.trim())) {
        throw new Error("El DNI debe tener exactamente 8 dÃ­gitos");
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
        throw new Error("El DNI debe tener exactamente 8 dÃ­gitos");
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

  // Obtener estadÃ­sticas del dashboard
  async obtenerEstadisticas(params = {}) {
    try {
      const { tipo = "registro", anio = "Todo" } = params;

      // Obtener estadÃ­sticas bÃ¡sicas y detalladas
      const resultado = await this.calcularEstadisticas(tipo, anio);

      // Agregar estadÃ­sticas adicionales para el dashboard
      const hoy = new Date().toISOString().split('T')[0];

      // Contar registros de hoy usando Supabase
      const { data: registrosHoy } = await this.model.db
        .from('registros')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_registro', hoy)
        .lt('fecha_registro', `${hoy}T23:59:59`)
        .eq('eliminado', false);

      return {
        ...resultado,
        hoy: registrosHoy || 0
      };
    } catch (error) {
      this.handleError(error, "Error obteniendo estadÃ­sticas");
    }
  }

  // Obtener aÃ±os disponibles para filtros
  async obtenerFechasDisponibles(tipo = "registro") {
    try {
      const resultado = await this.model.obtenerFechasDisponibles(tipo);
      return resultado;
    } catch (error) {
      this.handleError(error, "Error obteniendo fechas disponibles");
    }
  }

  // MÃ©todos auxiliares privados

  verificarCamposFaltantes(datos) {
    const { nombre, numero, dni, expediente } = datos;
    const faltantes = [];
    
    if (!nombre || nombre === "---") faltantes.push("nombre");
    if (!numero || numero === "---") faltantes.push("nÃºmero");
    if (!dni || dni === "---") faltantes.push("DNI");
    if (!expediente || expediente === "" || expediente === "---") faltantes.push("expediente");
    
    return faltantes;
  }

  async calcularEstadisticas(tipo, anio) {
    try {
      // Obtener todos los registros con sus relaciones
      let query = this.model.db
        .from('registros')
        .select(`
          id,
          estado_id,
          fecha_registro,
          estados!inner (nombre),
          expedientes (fecha_solicitud)
        `)
        .eq('eliminado', false);

      // Si se especifica un año, filtrar por él
      if (anio !== "Todo") {
        if (tipo === "solicitud") {
          // Filtrar por año de solicitud
          query = query.gte('expedientes.fecha_solicitud', `${anio}-01-01`)
                       .lte('expedientes.fecha_solicitud', `${anio}-12-31`);
        } else {
          // Filtrar por año de registro
          query = query.gte('fecha_registro', `${anio}-01-01T00:00:00`)
                       .lte('fecha_registro', `${anio}-12-31T23:59:59`);
        }
      }

      const { data: registros, error } = await query;

      if (error) throw error;

      // Contar por estado
      const conteo = {
        Recibido: 0,
        "En Caja": 0,
        Entregado: 0,
        Tesoreria: 0,
      };

      (registros || []).forEach(r => {
        const estadoNombre = r.estados?.nombre;
        if (conteo.hasOwnProperty(estadoNombre)) {
          conteo[estadoNombre]++;
        }
      });

      const total = Object.values(conteo).reduce((a, b) => a + b, 0);
      return { success: true, total, ...conteo };
    } catch (error) {
      console.error('Error calcularEstadisticas:', error);
      return { success: false };
    }
  }
}

module.exports = RegistroController;


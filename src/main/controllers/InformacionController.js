// src/main/controllers/InformacionController.js
const BaseController = require('./BaseController');

class InformacionController extends BaseController {
  constructor(personaModel, expedienteModel, registroModel) {
    super(null); // No usa un modelo específico
    this.personaModel = personaModel;
    this.expedienteModel = expedienteModel;
    this.registroModel = registroModel;
  }

  // Actualizar información completa (número, observación, fechas)
  async actualizarInformacion(datos) {
    try {
      this.validateRequired(datos, ['registro_id', 'expediente_id']);
      
      const {
        registro_id,
        expediente_id,
        numero,
        observacion,
        fecha_solicitud,
        fecha_entrega,
      } = this.sanitizeInput(datos);

      // Obtener persona_id desde el registro
      const registro = await this.registroModel.executeGet(
        "SELECT persona_id FROM registros WHERE id = ?", 
        [registro_id]
      );

      if (!registro) {
        throw new Error("Registro no encontrado");
      }

      // Actualizar persona (número)
      if (numero !== undefined) {
        await this.personaModel.actualizar(registro.persona_id, { numero: numero || null });
      }

      // Actualizar expediente (observación y fechas)
      await this.expedienteModel.actualizarInformacion(expediente_id, {
        observacion: observacion || null,
        fecha_solicitud: fecha_solicitud || null,
        fecha_entrega: fecha_entrega || null
      });

      return {
        success: true,
        message: "Información actualizada correctamente"
      };
    } catch (error) {
      this.handleError(error, "Error actualizando información");
    }
  }

  // Obtener información completa por DNI
  async obtenerInformacionCompleta(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      if (!/^\d{8}$/.test(dni.trim())) {
        throw new Error("El DNI debe tener exactamente 8 dígitos");
      }

      const registros = await this.registroModel.buscarPorDni(dni.trim());
      
      if (registros.length === 0) {
        return {
          success: false,
          message: "No se encontraron registros para este DNI",
          data: []
        };
      }

      // Agrupar información
      const informacion = {
        persona: {
          nombre: registros[0].nombre,
          dni: registros[0].dni,
          numero: registros[0].numero
        },
        registros: registros.map(r => ({
          registro_id: r.registro_id,
          expediente_id: r.expediente_id,
          codigo: r.codigo,
          estado: r.estado_nombre,
          fecha_registro: r.fecha_registro,
          fecha_en_caja: r.fecha_en_caja,
          fecha_solicitud: r.fecha_solicitud,
          fecha_entrega: r.fecha_entrega,
          observacion: r.observacion
        }))
      };

      return {
        success: true,
        data: informacion,
        total: registros.length
      };
    } catch (error) {
      this.handleError(error, "Error obteniendo información completa");
    }
  }

  // Obtener estadísticas de una persona
  async obtenerEstadisticasPersona(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      const registros = await this.registroModel.buscarPorDni(dni.trim());
      
      if (registros.length === 0) {
        return {
          success: false,
          message: "No se encontraron registros",
          estadisticas: null
        };
      }

      // Calcular estadísticas
      const estadisticas = {
        total_registros: registros.length,
        por_estado: {},
        expedientes_entregados: 0,
        expedientes_pendientes: 0,
        fecha_primer_registro: null,
        fecha_ultimo_registro: null
      };

      // Agrupar por estado
      registros.forEach(r => {
        const estado = r.estado_nombre;
        estadisticas.por_estado[estado] = (estadisticas.por_estado[estado] || 0) + 1;
        
        if (r.fecha_entrega) {
          estadisticas.expedientes_entregados++;
        } else {
          estadisticas.expedientes_pendientes++;
        }
      });

      // Fechas extremas
      const fechas = registros.map(r => new Date(r.fecha_registro)).sort();
      estadisticas.fecha_primer_registro = fechas[0]?.toISOString().split('T')[0];
      estadisticas.fecha_ultimo_registro = fechas[fechas.length - 1]?.toISOString().split('T')[0];

      return {
        success: true,
        estadisticas,
        persona: {
          nombre: registros[0].nombre,
          dni: registros[0].dni
        }
      };
    } catch (error) {
      this.handleError(error, "Error obteniendo estadísticas de persona");
    }
  }

  // Validar consistencia de datos
  async validarConsistenciaDatos(registro_id) {
    try {
      this.validateRequired({ registro_id }, ['registro_id']);
      
      const query = `
        SELECT 
          r.id as registro_id,
          r.estado_id,
          r.fecha_registro,
          r.fecha_en_caja,
          p.nombre,
          p.dni,
          p.numero,
          e.codigo,
          e.fecha_solicitud,
          e.fecha_entrega,
          es.nombre as estado_nombre
        FROM registros r
        JOIN personas p ON r.persona_id = p.id
        JOIN expedientes e ON r.expediente_id = e.id
        JOIN estados es ON r.estado_id = es.id
        WHERE r.id = ? AND r.eliminado = 0
      `;

      const registro = await this.registroModel.executeGet(query, [registro_id]);
      
      if (!registro) {
        throw new Error("Registro no encontrado");
      }

      const inconsistencias = [];

      // Validar fechas
      if (registro.fecha_entrega && !registro.fecha_solicitud) {
        inconsistencias.push("Expediente entregado sin fecha de solicitud");
      }

      if (registro.estado_nombre === "Entregado" && !registro.fecha_entrega) {
        inconsistencias.push("Estado 'Entregado' sin fecha de entrega");
      }

      if (registro.estado_nombre === "En Caja" && registro.fecha_en_caja === "No entregado") {
        inconsistencias.push("Estado 'En Caja' sin fecha en caja");
      }

      // Validar DNI
      if (registro.dni && !/^\d{8}$/.test(registro.dni)) {
        inconsistencias.push("DNI con formato inválido");
      }

      // Validar datos obligatorios
      if (!registro.nombre || registro.nombre.trim() === "") {
        inconsistencias.push("Nombre vacío");
      }

      return {
        success: true,
        consistente: inconsistencias.length === 0,
        inconsistencias,
        registro
      };
    } catch (error) {
      this.handleError(error, "Error validando consistencia");
    }
  }

  // Generar resumen para PDF o reporte
  async generarResumenPersona(dni) {
    try {
      this.validateRequired({ dni }, ['dni']);
      
      const informacion = await this.obtenerInformacionCompleta(dni);
      
      if (!informacion.success) {
        throw new Error(informacion.message);
      }

      const estadisticas = await this.obtenerEstadisticasPersona(dni);
      
      const resumen = {
        persona: informacion.data.persona,
        resumen: {
          total_registros: informacion.total,
          registros_activos: informacion.data.registros.length,
          ...estadisticas.estadisticas
        },
        registros: informacion.data.registros.map(r => ({
          expediente: r.codigo || "Sin código",
          estado: r.estado,
          fecha_registro: r.fecha_registro,
          fecha_solicitud: r.fecha_solicitud,
          fecha_entrega: r.fecha_entrega,
          observacion: r.observacion || "Sin observaciones"
        })),
        generado: new Date().toISOString().split('T')[0]
      };

      return {
        success: true,
        resumen
      };
    } catch (error) {
      this.handleError(error, "Error generando resumen");
    }
  }

  // Buscar persona por DNI (formato para frontend)
  async buscarPersonaPorDni({ dni }) {
    try {
      if (!dni) {
        throw new Error("DNI requerido");
      }

      const dniLimpio = dni.trim();

      if (!/^\d{8}$/.test(dniLimpio)) {
        throw new Error("El DNI debe tener exactamente 8 dígitos");
      }

      // Buscar registros por DNI
      const registros = await this.registroModel.buscarPorDni(dniLimpio);

      if (registros.length === 0) {
        return {
          success: true,
          persona: null,
          registros: [],
          message: "No se encontraron registros para este DNI"
        };
      }

      // Obtener datos de persona (del primer registro)
      const primerRegistro = registros[0];
      const persona = {
        dni: primerRegistro.dni,
        nombres: primerRegistro.nombre ? primerRegistro.nombre.split(' ').slice(0, -2).join(' ') : '',
        apellidos: primerRegistro.nombre ? primerRegistro.nombre.split(' ').slice(-2).join(' ') : primerRegistro.nombre,
        telefono: primerRegistro.telefono || 'No registrado',
        email: primerRegistro.email || 'No registrado',
        fecha_nacimiento: primerRegistro.fecha_nacimiento || '2000-01-01',
        direccion: primerRegistro.direccion || 'No registrada',
        ocupacion: primerRegistro.ocupacion || 'No registrada'
      };

      // Formatear registros para el frontend
      const registrosFormateados = registros.map(r => ({
        id: r.registro_id,
        expediente: r.codigo || r.expediente,
        codigo: r.codigo,
        numero: r.numero,
        fecha_registro: r.fecha_registro,
        estado: r.estado_nombre || r.estado,
        proyecto: r.proyecto_nombre || 'Proyecto General',
        descripcion: r.observacion || 'Sin descripción'
      }));

      return {
        success: true,
        persona,
        registros: registrosFormateados
      };
    } catch (error) {
      console.error("Error en buscarPersonaPorDni:", error);
      return {
        success: false,
        error: error.message,
        persona: null,
        registros: []
      };
    }
  }

  // Buscar personas similares (para evitar duplicados)
  async buscarPersonasSimilares(nombre, dni) {
    try {
      let similares = [];

      // Buscar por DNI similar
      if (dni && dni.length >= 6) {
        const dniPattern = `%${dni.substring(0, 6)}%`;
        const porDni = await this.personaModel.executeQuery(
          "SELECT * FROM personas WHERE dni LIKE ? AND dni != ?",
          [dniPattern, dni]
        );
        similares = [...similares, ...porDni];
      }

      // Buscar por nombre similar
      if (nombre && nombre.length >= 3) {
        const nombrePattern = `%${nombre}%`;
        const porNombre = await this.personaModel.executeQuery(
          "SELECT * FROM personas WHERE nombre LIKE ?",
          [nombrePattern]
        );
        similares = [...similares, ...porNombre];
      }

      // Eliminar duplicados
      const unicos = similares.filter((persona, index, arr) =>
        arr.findIndex(p => p.id === persona.id) === index
      );

      return {
        success: true,
        similares: unicos,
        total: unicos.length
      };
    } catch (error) {
      this.handleError(error, "Error buscando personas similares");
    }
  }
}

module.exports = InformacionController;
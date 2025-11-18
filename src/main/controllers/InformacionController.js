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
      const registro = await this.registroModel.obtenerPorId(registro_id);

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

      const registro = await this.registroModel.obtenerPorId(registro_id);

      if (!registro) {
        throw new Error("Registro no encontrado");
      }

      const inconsistencias = [];

      // Validar fechas
      if (registro.expediente_fecha_entrega && !registro.expediente_fecha_solicitud) {
        inconsistencias.push("Expediente entregado sin fecha de solicitud");
      }

      if (registro.estado_nombre === "Entregado" && !registro.expediente_fecha_entrega) {
        inconsistencias.push("Estado 'Entregado' sin fecha de entrega");
      }

      if (registro.estado_nombre === "En Caja" && (!registro.fecha_en_caja || registro.fecha_en_caja === "No entregado")) {
        inconsistencias.push("Estado 'En Caja' sin fecha en caja");
      }

      // Validar DNI
      if (registro.persona_dni && !/^\d{8}$/.test(registro.persona_dni)) {
        inconsistencias.push("DNI con formato inválido");
      }

      // Validar datos obligatorios
      if (!registro.persona_nombre || registro.persona_nombre.trim() === "") {
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
        generado: (() => {
          const ahora = new Date();
          const año = ahora.getFullYear();
          const mes = String(ahora.getMonth() + 1).padStart(2, '0');
          const dia = String(ahora.getDate()).padStart(2, '0');
          return `${año}-${mes}-${dia}`;
        })()
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
        // Fallback: si no hay registros, intentar encontrar a la persona directamente
        const personaDb = await this.personaModel.buscarPorDni(dniLimpio);
        if (personaDb) {
          return {
            success: true,
            persona: {
              id: personaDb.id,
              dni: personaDb.dni,
              nombre: personaDb.nombre,
              numero: personaDb.numero
            },
            registros: [],
            message: "Persona encontrada sin registros"
          };
        }
        return {
          success: true,
          persona: null,
          registros: [],
          message: "No se encontraron registros para este DNI"
        };
      }

      // Obtener datos de persona (del primer registro)
      const primerRegistro = registros[0];
      const nombreCompleto = (primerRegistro.nombre || '').trim();
      const partes = nombreCompleto.split(' ').filter(Boolean);
      let nombres = '';
      let apellidos = '';
      if (partes.length >= 3) {
        nombres = partes.slice(0, -2).join(' ');
        apellidos = partes.slice(-2).join(' ');
      } else if (partes.length === 2) {
        nombres = partes[0];
        apellidos = partes[1];
      } else if (partes.length === 1) {
        nombres = partes[0];
        apellidos = '';
      }
      const persona = {
        id: primerRegistro.persona_id,
        dni: primerRegistro.dni,
        nombre: nombreCompleto,
        nombres,
        apellidos,
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
        fecha_en_caja: r.fecha_en_caja,
        proyecto: r.proyecto_nombre || 'Proyecto General',
        observacion: r.observacion || null
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
        const dniPattern = dni.substring(0, 6);
        const { data: porDni, error: errorDni } = await this.personaModel.db
          .from('personas')
          .select('*')
          .ilike('dni', `${dniPattern}%`)
          .neq('dni', dni);

        if (!errorDni && porDni) {
          similares = [...similares, ...porDni];
        }
      }

      // Buscar por nombre similar
      if (nombre && nombre.length >= 3) {
        const { data: porNombre, error: errorNombre } = await this.personaModel.db
          .from('personas')
          .select('*')
          .ilike('nombre', `%${nombre}%`);

        if (!errorNombre && porNombre) {
          similares = [...similares, ...porNombre];
        }
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

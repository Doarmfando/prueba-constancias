// src/main/ipc/InformacionIPCHandler.js
const BaseIPCHandler = require('./BaseIPCHandler');

class InformacionIPCHandler extends BaseIPCHandler {
  constructor(informacionController) {
    super();
    this.informacionController = informacionController;
  }

  registerHandlers() {
    // Operaciones de información
    this.handle("actualizar-informacion", this.informacionController, "actualizarInformacion");
    this.handle("obtener-informacion-completa", this.informacionController, "obtenerInformacionCompleta");
    this.handle("obtener-estadisticas-persona", this.informacionController, "obtenerEstadisticasPersona");
    this.handle("validar-consistencia-datos", this.informacionController, "validarConsistenciaDatos");
    this.handle("generar-resumen-persona", this.informacionController, "generarResumenPersona");
    this.handle("buscar-personas-similares", this.informacionController, "buscarPersonasSimilares");
    this.handle("buscar-persona-por-dni", this.informacionController, "buscarPersonaPorDni");

    console.log("Handlers de Información registrados");
  }

  // Métodos específicos con validaciones adicionales

  // Wrapper para actualizar información con validaciones específicas
  async actualizarInformacionValidada(datos) {
    try {
      if (!datos) {
        throw new Error("No se proporcionaron datos para actualizar");
      }

      const { registro_id, expediente_id } = datos;

      if (!registro_id || !expediente_id) {
        throw new Error("registro_id y expediente_id son requeridos");
      }

      const resultado = await this.informacionController.actualizarInformacion(datos);
      
      return {
        success: true,
        message: "Información actualizada correctamente",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error en actualizarInformacionValidada:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Wrapper para obtener información completa con cache
  async obtenerInformacionConCache(dni) {
    try {
      if (!dni) {
        throw new Error("DNI requerido");
      }

      const resultado = await this.informacionController.obtenerInformacionCompleta(dni);
      
      if (resultado.success) {
        // Agregar metadatos útiles para el frontend
        return {
          ...resultado,
          metadata: {
            consultado: new Date().toISOString(),
            dni: dni,
            total_registros: resultado.total || 0
          }
        };
      } else {
        return resultado;
      }
    } catch (error) {
      console.error("Error en obtenerInformacionConCache:", error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Generar reporte completo de persona
  async generarReporteCompleto(dni) {
    try {
      if (!dni) {
        throw new Error("DNI requerido para generar reporte");
      }

      // Obtener toda la información disponible
      const [informacion, estadisticas, resumen] = await Promise.all([
        this.informacionController.obtenerInformacionCompleta(dni),
        this.informacionController.obtenerEstadisticasPersona(dni),
        this.informacionController.generarResumenPersona(dni)
      ]);

      // Validar consistencia de todos los registros
      const validacionesConsistencia = [];
      if (informacion.success && informacion.data.registros) {
        for (const registro of informacion.data.registros) {
          try {
            const validacion = await this.informacionController.validarConsistenciaDatos(registro.registro_id);
            validacionesConsistencia.push({
              registro_id: registro.registro_id,
              ...validacion
            });
          } catch (error) {
            validacionesConsistencia.push({
              registro_id: registro.registro_id,
              success: false,
              error: error.message
            });
          }
        }
      }

      const reporte = {
        success: true,
        dni,
        generado: new Date().toISOString(),
        informacion: informacion.success ? informacion.data : null,
        estadisticas: estadisticas.success ? estadisticas.estadisticas : null,
        resumen: resumen.success ? resumen.resumen : null,
        consistencia: {
          total_validaciones: validacionesConsistencia.length,
          consistentes: validacionesConsistencia.filter(v => v.consistente).length,
          inconsistentes: validacionesConsistencia.filter(v => !v.consistente).length,
          detalles: validacionesConsistencia
        }
      };

      return reporte;
    } catch (error) {
      console.error("Error en generarReporteCompleto:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Buscar duplicados potenciales
  async buscarDuplicadosPotenciales(datos) {
    try {
      const { nombre, dni } = datos;

      if (!nombre && !dni) {
        throw new Error("Se requiere al menos nombre o DNI para buscar duplicados");
      }

      const similares = await this.informacionController.buscarPersonasSimilares(nombre, dni);
      
      if (similares.success) {
        // Analizar nivel de similitud
        const analisis = similares.similares.map(persona => {
          let puntaje = 0;
          let razones = [];

          // Similitud de DNI
          if (dni && persona.dni) {
            const coincidencias = this.contarCoincidenciasString(dni, persona.dni);
            if (coincidencias >= 6) {
              puntaje += 3;
              razones.push(`DNI similar (${coincidencias}/8 dígitos coinciden)`);
            }
          }

          // Similitud de nombre
          if (nombre && persona.nombre) {
            const palabrasComunes = this.contarPalabrasComunes(nombre, persona.nombre);
            if (palabrasComunes > 0) {
              puntaje += palabrasComunes;
              razones.push(`Nombre similar (${palabrasComunes} palabras en común)`);
            }
          }

          return {
            ...persona,
            puntaje_similitud: puntaje,
            razones_similitud: razones,
            riesgo_duplicado: puntaje >= 3 ? "alto" : puntaje >= 1 ? "medio" : "bajo"
          };
        });

        // Ordenar por puntaje de similitud
        analisis.sort((a, b) => b.puntaje_similitud - a.puntaje_similitud);

        return {
          success: true,
          duplicados_potenciales: analisis,
          total: analisis.length,
          alto_riesgo: analisis.filter(p => p.riesgo_duplicado === "alto").length,
          medio_riesgo: analisis.filter(p => p.riesgo_duplicado === "medio").length
        };
      } else {
        return similares;
      }
    } catch (error) {
      console.error("Error en buscarDuplicadosPotenciales:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Métodos auxiliares

  contarCoincidenciasString(str1, str2) {
    if (!str1 || !str2) return 0;
    
    let coincidencias = 0;
    const longitud = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < longitud; i++) {
      if (str1[i] === str2[i]) {
        coincidencias++;
      }
    }
    
    return coincidencias;
  }

  contarPalabrasComunes(nombre1, nombre2) {
    if (!nombre1 || !nombre2) return 0;
    
    const palabras1 = nombre1.toLowerCase().split(/\s+/);
    const palabras2 = nombre2.toLowerCase().split(/\s+/);
    
    let comunes = 0;
    for (const palabra1 of palabras1) {
      if (palabra1.length > 2 && palabras2.includes(palabra1)) {
        comunes++;
      }
    }
    
    return comunes;
  }

  // Registrar handlers con validaciones adicionales
  registerAdvancedHandlers() {
    this.handle("actualizar-informacion-validada", this, "actualizarInformacionValidada");
    this.handle("obtener-informacion-con-cache", this, "obtenerInformacionConCache");
    this.handle("generar-reporte-completo", this, "generarReporteCompleto");
    this.handle("buscar-duplicados-potenciales", this, "buscarDuplicadosPotenciales");
    
    console.log("✅ Handlers avanzados de Información registrados");
  }
}

module.exports = InformacionIPCHandler;
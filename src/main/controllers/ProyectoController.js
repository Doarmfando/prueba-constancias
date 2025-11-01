const BaseController = require('./BaseController');
const PDFService = require('../services/PDFService');

class ProyectoController extends BaseController {
  constructor(proyectoModel, auditoriaModel, registroModel) {
    super();
    this.proyectoModel = proyectoModel;
    this.auditoriaModel = auditoriaModel;
    this.registroModel = registroModel;
    this.pdfService = new PDFService();
  }

  // Crear nuevo proyecto
  async crear(datos, usuarioActual) {
    try {
      const datosCompletos = {
        ...datos,
        usuario_creador_id: usuarioActual.id
      };

      const proyectoId = await this.proyectoModel.crear(datosCompletos);

      // Registrar en auditoría
      await this.auditoriaModel.registrarCreacion(
        usuarioActual.id,
        'proyectos_registros',
        proyectoId,
        proyectoId,
        { nombre: datos.nombre }
      );

      const proyecto = await this.proyectoModel.obtenerPorId(proyectoId);

      return {
        success: true,
        proyecto
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener proyectos del usuario (solo sus propios proyectos)
  async obtenerMisProyectos(usuarioId, usuario = null) {
    try {
      // Siempre mostrar solo los proyectos del usuario, independientemente del rol
      const proyectos = await this.proyectoModel.listarPorUsuario(usuarioId);

      return {
        success: true,
        proyectos
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener proyectos privados de otros usuarios (solo administrador)
  async obtenerProyectosPrivadosOtros(usuarioActual) {
    try {
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para ver proyectos privados de otros usuarios');
      }

      // Obtener todos los proyectos privados que NO sean del usuario actual
      const proyectos = await this.proyectoModel.executeQuery(
        `SELECT
          p.*,
          u.nombre as nombre_creador,
          (SELECT COUNT(*) FROM registros r WHERE r.proyecto_id = p.id AND r.eliminado = 0) as total_registros
        FROM proyectos_registros p
        LEFT JOIN usuarios u ON p.usuario_creador_id = u.id
        WHERE p.es_publico = 0 AND p.usuario_creador_id != ? AND p.activo = 1
        ORDER BY p.fecha_creacion DESC`,
        [usuarioActual.id]
      );

      return {
        success: true,
        proyectos
      };
    } catch (error) {
      console.error('Error obteniendo proyectos privados de otros:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener proyectos públicos
  async obtenerProyectosPublicos() {
    try {
      const proyectos = await this.proyectoModel.listarPublicos();

      return {
        success: true,
        proyectos
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener todos los proyectos (solo admin)
  async obtenerTodos(usuarioActual) {
    try {
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para ver todos los proyectos');
      }

      const proyectos = await this.proyectoModel.listarTodos();

      return {
        success: true,
        proyectos
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener proyecto por ID
  async obtenerPorId(id, usuarioActual) {
    try {
      const proyecto = await this.proyectoModel.obtenerPorId(id);

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      // Verificar permisos de acceso
      const tieneAcceso = usuarioActual.rol === 'administrador' ||
                          proyecto.usuario_creador_id === usuarioActual.id ||
                          proyecto.es_publico === 1;

      if (!tieneAcceso) {
        throw new Error('No tienes permisos para acceder a este proyecto');
      }

      return {
        success: true,
        proyecto
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar proyecto
  async actualizar(id, datos, usuarioActual) {
    try {
      const proyecto = await this.proyectoModel.obtenerPorId(id);

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      // Solo el creador o admin pueden actualizar
      const puedeActualizar = usuarioActual.rol === 'administrador' ||
                              proyecto.usuario_creador_id === usuarioActual.id;

      if (!puedeActualizar) {
        throw new Error('No tienes permisos para actualizar este proyecto');
      }

      const proyectoActualizado = await this.proyectoModel.actualizar(id, datos, usuarioActual.id);

      // Registrar en auditoría
      await this.auditoriaModel.registrarEdicion(
        usuarioActual.id,
        'proyectos_registros',
        id,
        id,
        datos
      );

      return {
        success: true,
        proyecto: proyectoActualizado
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Hacer público un proyecto
  async hacerPublico(id, usuarioActual) {
    try {
      const proyecto = await this.proyectoModel.hacerPublico(id, usuarioActual.id);

      // Registrar en auditoría
      await this.auditoriaModel.registrarPublicacion(usuarioActual.id, id);

      return {
        success: true,
        proyecto
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Hacer privado un proyecto
  async hacerPrivado(id, usuarioActual) {
    try {
      const proyecto = await this.proyectoModel.hacerPrivado(id, usuarioActual.id);

      // Registrar en auditoría
      await this.auditoriaModel.registrarAccion({
        usuario_id: usuarioActual.id,
        accion: 'hacer_privado',
        tabla_afectada: 'proyectos_registros',
        registro_id: id,
        proyecto_id: id
      });

      return {
        success: true,
        proyecto
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar proyecto
  async eliminar(id, usuarioActual) {
    try {
      const proyecto = await this.proyectoModel.obtenerPorId(id);

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      // Solo el creador o admin pueden eliminar
      const puedeEliminar = usuarioActual.rol === 'administrador' ||
                           proyecto.usuario_creador_id === usuarioActual.id;

      if (!puedeEliminar) {
        throw new Error('No tienes permisos para eliminar este proyecto');
      }

      await this.proyectoModel.eliminar(id, usuarioActual.id);

      // Registrar en auditoría
      await this.auditoriaModel.registrarEliminacion(
        usuarioActual.id,
        'proyectos_registros',
        id,
        id,
        { nombre: proyecto.nombre }
      );

      return {
        success: true,
        message: 'Proyecto eliminado correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar permisos de acceso
  async verificarAcceso(proyectoId, usuarioId, tipoAcceso = 'ver') {
    try {
      const acceso = await this.proyectoModel.verificarAcceso(proyectoId, usuarioId, tipoAcceso);

      return {
        success: true,
        acceso
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estadísticas de proyectos
  async obtenerEstadisticas(usuarioActual) {
    try {
      let estadisticas;

      if (usuarioActual.rol === 'administrador') {
        // Admin ve estadísticas generales
        estadisticas = await this.proyectoModel.obtenerEstadisticas();
      } else {
        // Trabajador ve solo sus estadísticas
        estadisticas = await this.proyectoModel.obtenerEstadisticas(usuarioActual.id);
      }

      return {
        success: true,
        estadisticas
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Buscar proyectos
  async buscar(termino, usuarioActual) {
    try {
      let proyectos;

      if (usuarioActual.rol === 'administrador') {
        // Admin puede buscar en todos los proyectos
        proyectos = await this.proyectoModel.buscar(termino);
      } else {
        // Trabajador busca solo en proyectos accesibles
        proyectos = await this.proyectoModel.buscar(termino, usuarioActual.id);
      }

      return {
        success: true,
        proyectos
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Duplicar proyecto
  async duplicar(id, nuevoNombre, usuarioActual) {
    try {
      const proyectoOriginal = await this.proyectoModel.obtenerPorId(id);

      if (!proyectoOriginal) {
        throw new Error('Proyecto no encontrado');
      }

      // Verificar permisos de acceso al proyecto original
      const tieneAcceso = usuarioActual.rol === 'administrador' ||
                          proyectoOriginal.usuario_creador_id === usuarioActual.id ||
                          proyectoOriginal.es_publico === 1;

      if (!tieneAcceso) {
        throw new Error('No tienes permisos para duplicar este proyecto');
      }

      // Crear nuevo proyecto
      const datosNuevoProyecto = {
        nombre: nuevoNombre || `${proyectoOriginal.nombre} (Copia)`,
        descripcion: proyectoOriginal.descripcion,
        usuario_creador_id: usuarioActual.id,
        es_publico: 0, // Siempre crear como privado
        permite_edicion: proyectoOriginal.permite_edicion
      };

      const nuevoProyectoId = await this.proyectoModel.crear(datosNuevoProyecto);

      // Registrar en auditoría
      await this.auditoriaModel.registrarAccion({
        usuario_id: usuarioActual.id,
        accion: 'duplicar',
        tabla_afectada: 'proyectos_registros',
        registro_id: nuevoProyectoId,
        proyecto_id: nuevoProyectoId,
        detalles: { proyecto_original: id, nombre_original: proyectoOriginal.nombre }
      });

      const nuevoProyecto = await this.proyectoModel.obtenerPorId(nuevoProyectoId);

      return {
        success: true,
        proyecto: nuevoProyecto
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Exportar proyecto a PDF
  async exportarProyectoPDF(proyectoId, titulo, incluirEliminados = false, usuarioActual) {
    try {
      // Obtener el proyecto
      const proyecto = await this.proyectoModel.obtenerPorId(proyectoId);

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      // Verificar permisos de acceso
      const tieneAcceso = usuarioActual.rol === 'administrador' ||
                          proyecto.usuario_creador_id === usuarioActual.id ||
                          proyecto.es_publico === 1;

      if (!tieneAcceso) {
        throw new Error('No tienes permisos para exportar este proyecto');
      }

      // Obtener registros del proyecto
      const registros = await this.registroModel.obtenerTodos(proyectoId);
      const registrosEliminados = incluirEliminados ? await this.registroModel.obtenerEliminados(proyectoId) : [];

      // Exportar a PDF
      const resultado = await this.pdfService.exportarProyectoPDF(proyecto, registros, {
        titulo: titulo || proyecto.nombre,
        incluirEliminados,
        registrosEliminados
      });

      // Registrar en auditoría si fue exitoso
      if (resultado.success) {
        await this.auditoriaModel.registrarAccion({
          usuario_id: usuarioActual.id,
          accion: 'exportar_pdf',
          tabla_afectada: 'proyectos_registros',
          registro_id: proyectoId,
          proyecto_id: proyectoId,
          detalles: { titulo, incluir_eliminados: incluirEliminados }
        });
      }

      return resultado;
    } catch (error) {
      console.error('Error exportando proyecto a PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ProyectoController;
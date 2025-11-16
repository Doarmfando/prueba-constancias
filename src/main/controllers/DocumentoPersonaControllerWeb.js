// src/main/controllers/DocumentoPersonaControllerWeb.js
// Versión del controller para modo web (sin dependencias de Electron)

const BaseController = require('./BaseController');
const path = require('path');
const fs = require('fs');
const os = require('os');

class DocumentoPersonaControllerWeb extends BaseController {
  constructor(documentoPersonaModel, personaModel, storageService = null) {
    super(documentoPersonaModel);
    this.personaModel = personaModel;
    this.storage = storageService;
  }

  // Subir documento usando solo Supabase Storage
  async subirDocumento(datos) {
    try {
      this.validateRequired(datos, ['persona_id', 'archivo_origen', 'nombre_archivo']);

      const { persona_id, archivo_origen, nombre_archivo, comentario, usuario_carga_id } = datos;

      // Obtener la persona
      const persona = await this.personaModel.buscarPorId(persona_id);
      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      if (!persona.dni) {
        throw new Error('La persona no tiene DNI registrado');
      }

      // Leer archivo
      const archivoBuffer = fs.readFileSync(archivo_origen);
      const tamaño_bytes = archivoBuffer.length;

      // Determinar content type
      const contentType = this.obtenerContentType(nombre_archivo);

      // Generar ruta única en Supabase
      const rutaSupabase = this.storage.generarRutaUnica(persona.dni, nombre_archivo);

      // Subir a Supabase Storage
      const resultadoUpload = await this.storage.subirArchivo(
        archivoBuffer,
        rutaSupabase,
        { contentType }
      );

      if (!resultadoUpload.success) {
        throw new Error(`Error subiendo archivo: ${resultadoUpload.error}`);
      }

      // Guardar en base de datos
      const resultado = await this.model.crear({
        persona_id,
        nombre_archivo: nombre_archivo,
        ruta_archivo: rutaSupabase,
        url_archivo: resultadoUpload.url,
        tipo_archivo: this.model.obtenerTipoArchivo(nombre_archivo),
        comentario: comentario || '',
        usuario_carga_id: usuario_carga_id || null,
        tamaño_bytes,
        ubicacion_almacenamiento: 'SUPABASE'
      });

      // Obtener el documento recién creado
      const documento = await this.model.obtenerPorId(resultado.id);

      return {
        success: true,
        message: 'Documento cargado exitosamente en la nube',
        documento,
        id: resultado.id,
        ubicacion: 'SUPABASE'
      };
    } catch (error) {
      this.handleError(error, 'Error subiendo documento');
    }
  }

  // Obtener Content-Type basado en la extensión del archivo
  obtenerContentType(nombreArchivo) {
    const extension = path.extname(nombreArchivo).toLowerCase().replace('.', '');
    const tipos = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed'
    };
    return tipos[extension] || 'application/octet-stream';
  }

  // Obtener documentos de una persona
  async obtenerDocumentosPersona(persona_id) {
    try {
      this.validateRequired({ persona_id }, ['persona_id']);

      const documentos = await this.model.obtenerPorPersona(persona_id);

      return {
        success: true,
        documentos,
        total: documentos.length
      };
    } catch (error) {
      this.handleError(error, 'Error obteniendo documentos');
    }
  }

  // Eliminar documento
  async eliminarDocumento(datos) {
    try {
      const { id, usuario } = datos;
      this.validateRequired({ id }, ['id']);

      // Obtener información del documento
      const documento = await this.model.obtenerPorId(id);

      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      // Eliminar de Supabase Storage
      if (documento.ubicacion_almacenamiento === 'SUPABASE' && this.storage) {
        try {
          console.log('🗑️ Eliminando archivo de Supabase Storage...');
          const resultado = await this.storage.eliminarArchivo(documento.ruta_archivo);
          if (resultado.success) {
            console.log('✅ Archivo eliminado de Supabase Storage');
          }
        } catch (error) {
          console.error('Error eliminando de Supabase Storage:', error);
          // Continuar con la eliminación de BD aunque falle la eliminación del archivo
        }
      }

      // Eliminar de la base de datos
      await this.model.eliminar(id);

      return {
        success: true,
        message: 'Documento eliminado correctamente'
      };
    } catch (error) {
      this.handleError(error, 'Error eliminando documento');
    }
  }

  // Descargar documento (retorna buffer para el servidor)
  async descargarDocumento(id) {
    try {
      const documento = await this.model.obtenerPorId(id);

      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      // Descargar desde Supabase
      if (documento.ubicacion_almacenamiento === 'SUPABASE' && this.storage) {
        const resultado = await this.storage.descargarArchivo(documento.ruta_archivo);

        if (!resultado.success) {
          throw new Error(`No se pudo descargar el archivo: ${resultado.error}`);
        }

        const buffer = Buffer.from(await resultado.data.arrayBuffer());

        return {
          success: true,
          buffer,
          nombre_archivo: documento.nombre_archivo,
          content_type: this.obtenerContentType(documento.nombre_archivo)
        };
      } else {
        throw new Error('El archivo no está disponible en Supabase Storage');
      }
    } catch (error) {
      this.handleError(error, 'Error descargando documento');
    }
  }

  // Actualizar comentario de documento
  async actualizarComentario(datos) {
    try {
      const { id, comentario } = datos;
      this.validateRequired({ id }, ['id']);

      await this.model.actualizarComentario(id, comentario || '');

      return {
        success: true,
        message: 'Comentario actualizado'
      };
    } catch (error) {
      this.handleError(error, 'Error actualizando comentario');
    }
  }

  // Obtener estadísticas de documentos
  async obtenerEstadisticas() {
    try {
      const stats = await this.model.obtenerEstadisticas();

      return {
        success: true,
        estadisticas: stats
      };
    } catch (error) {
      this.handleError(error, 'Error obteniendo estadísticas');
    }
  }

  // Obtener todas las personas con contador de documentos
  async obtenerPersonasConDocumentos() {
    try {
      const personas = await this.personaModel.obtenerConDocumentos();

      return {
        success: true,
        personas,
        total: personas.length
      };
    } catch (error) {
      this.handleError(error, 'Error obteniendo personas');
    }
  }

  // Buscar personas por DNI o nombre
  async buscarPersonas(termino) {
    try {
      const personas = await this.personaModel.buscar(termino);

      return {
        success: true,
        personas,
        total: personas.length
      };
    } catch (error) {
      this.handleError(error, 'Error buscando personas');
    }
  }
}

module.exports = DocumentoPersonaControllerWeb;

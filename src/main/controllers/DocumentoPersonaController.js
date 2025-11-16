// src/main/controllers/DocumentoPersonaController.js
const BaseController = require('./BaseController');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DocumentoPersonaController extends BaseController {
  constructor(documentoPersonaModel, personaModel, hybridStorageService = null) {
    super(documentoPersonaModel);
    this.personaModel = personaModel;
    this.hybridStorage = hybridStorageService;

    // Definir la ruta base para documentos
    this.documentosBasePath = path.join(app.getPath('userData'), 'documentos', 'personas');

    // Crear el directorio si no existe
    this.asegurarDirectorioBase();
  }

  // Asegurar que existe el directorio base
  asegurarDirectorioBase() {
    try {
      if (!fs.existsSync(this.documentosBasePath)) {
        fs.mkdirSync(this.documentosBasePath, { recursive: true });
        console.log(`📁 Directorio creado: ${this.documentosBasePath}`);
      }
    } catch (error) {
      console.error('Error creando directorio base:', error);
    }
  }

  // Asegurar que existe el directorio para un DNI específico
  asegurarDirectorioPersona(dni) {
    const dirPersona = path.join(this.documentosBasePath, dni.toString());

    try {
      if (!fs.existsSync(dirPersona)) {
        fs.mkdirSync(dirPersona, { recursive: true });
        console.log(`📁 Directorio creado para DNI ${dni}: ${dirPersona}`);
      }
      return dirPersona;
    } catch (error) {
      console.error(`Error creando directorio para DNI ${dni}:`, error);
      throw new Error('No se pudo crear el directorio para almacenar documentos');
    }
  }

  // Subir documento (usando HybridStorage si está disponible)
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

      let rutaArchivo, urlArchivo, ubicacion, notificacion;

      // Si HybridStorage está disponible, usarlo
      if (this.hybridStorage) {
        console.log('📤 Usando HybridStorageService para subir documento...');

        const resultadoUpload = await this.hybridStorage.subirArchivoConFallback(
          archivoBuffer,
          persona.dni,
          nombre_archivo,
          { contentType }
        );

        if (!resultadoUpload.success) {
          throw new Error(resultadoUpload.error);
        }

        rutaArchivo = resultadoUpload.ruta;
        urlArchivo = resultadoUpload.url || null;
        ubicacion = resultadoUpload.ubicacion; // 'SUPABASE' o 'LOCAL'

        // Si se guardó localmente, preparar notificación
        if (resultadoUpload.advertencia) {
          notificacion = {
            tipo: resultadoUpload.tipoError,
            mensaje: resultadoUpload.mensaje,
            nombreArchivo: nombre_archivo,
            enCola: resultadoUpload.enCola,
            archivosEnCola: this.hybridStorage.obtenerEstadisticasCola().total
          };
        }
      } else {
        // Fallback: guardar solo localmente (legacy)
        console.log('💾 HybridStorage no disponible, guardando solo localmente...');

        const dirPersona = this.asegurarDirectorioPersona(persona.dni);
        const timestamp = Date.now();
        const extension = path.extname(nombre_archivo);
        const nombreBase = path.basename(nombre_archivo, extension);
        const nombreUnico = `${nombreBase}_${timestamp}${extension}`;
        rutaArchivo = path.join(dirPersona, nombreUnico);

        fs.writeFileSync(rutaArchivo, archivoBuffer);
        urlArchivo = null;
        ubicacion = 'LOCAL';
      }

      // Guardar en base de datos
      const resultado = await this.model.crear({
        persona_id,
        nombre_archivo: nombre_archivo,
        ruta_archivo: rutaArchivo,
        url_archivo: urlArchivo,
        tipo_archivo: this.model.obtenerTipoArchivo(nombre_archivo),
        comentario: comentario || '',
        usuario_carga_id: usuario_carga_id || null,
        tamaño_bytes,
        ubicacion_almacenamiento: ubicacion
      });

      // Obtener el documento recién creado
      const documento = await this.model.obtenerPorId(resultado.id);

      return {
        success: true,
        message: ubicacion === 'SUPABASE'
          ? 'Documento cargado exitosamente en la nube'
          : 'Documento guardado localmente',
        documento,
        id: resultado.id,
        ubicacion,
        notificacion // Incluir notificación si hay
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

      // Eliminar de Supabase Storage si está ahí
      if (documento.ubicacion_almacenamiento === 'SUPABASE') {
        if (this.hybridStorage) {
          try {
            console.log('🗑️ Eliminando archivo de Supabase Storage...');
            const resultado = await this.hybridStorage.storageService.eliminarArchivo(documento.ruta_archivo);
            if (resultado.success) {
              console.log('✅ Archivo eliminado de Supabase Storage');
            }
          } catch (error) {
            console.error('Error eliminando de Supabase Storage:', error);
            // Continuar con la eliminación de BD aunque falle la eliminación del archivo
          }
        }
      } else {
        // Eliminar archivo físico local
        if (fs.existsSync(documento.ruta_archivo)) {
          fs.unlinkSync(documento.ruta_archivo);
          console.log(`🗑️ Archivo local eliminado: ${documento.ruta_archivo}`);
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

  // Descargar/Abrir documento
  async abrirDocumento(datos) {
    try {
      const { id } = datos;
      this.validateRequired({ id }, ['id']);

      const documento = await this.model.obtenerPorId(id);

      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      let rutaArchivo;

      // Verificar si el archivo está en Supabase
      if (documento.ubicacion_almacenamiento === 'SUPABASE') {
        console.log('📥 Archivo en Supabase, descargando...');

        // Verificar si ya existe localmente en caché
        const cacheDir = path.join(app.getPath('temp'), 'documentos_cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        const nombreArchivoSanitizado = documento.nombre_archivo.replace(/[^a-zA-Z0-9._-]/g, '_');
        const rutaCache = path.join(cacheDir, `${id}_${nombreArchivoSanitizado}`);

        // Si ya existe en caché, usar esa versión
        if (fs.existsSync(rutaCache)) {
          console.log('✅ Usando versión en caché');
          rutaArchivo = rutaCache;
        } else {
          // Descargar desde Supabase
          if (!this.hybridStorage) {
            throw new Error('El archivo está en la nube pero el servicio de almacenamiento no está disponible');
          }

          const resultado = await this.hybridStorage.descargarArchivo(documento.ruta_archivo, false);

          if (!resultado.success) {
            throw new Error(`No se pudo descargar el archivo desde la nube: ${resultado.error}`);
          }

          // Guardar en caché temporal
          fs.writeFileSync(rutaCache, Buffer.from(await resultado.data.arrayBuffer()));
          console.log(`💾 Archivo descargado y guardado en caché: ${rutaCache}`);
          rutaArchivo = rutaCache;
        }
      } else {
        // Archivo local
        if (!fs.existsSync(documento.ruta_archivo)) {
          throw new Error('El archivo ya no existe en el sistema. Si fue guardado en otra computadora, no está disponible localmente.');
        }
        rutaArchivo = documento.ruta_archivo;
      }

      // Abrir el archivo con la aplicación predeterminada
      const { shell } = require('electron');
      await shell.openPath(rutaArchivo);

      return {
        success: true,
        message: 'Documento abierto',
        ruta: rutaArchivo
      };
    } catch (error) {
      this.handleError(error, 'Error abriendo documento');
    }
  }

  // Descargar documento (guardar en ubicación elegida por el usuario)
  async descargarDocumento(datos) {
    try {
      const { id } = datos;
      this.validateRequired({ id }, ['id']);

      const documento = await this.model.obtenerPorId(id);

      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      let rutaArchivoTemporal;

      // Verificar si el archivo está en Supabase
      if (documento.ubicacion_almacenamiento === 'SUPABASE') {
        console.log('📥 Descargando archivo desde Supabase...');

        // Descargar desde Supabase a una ubicación temporal
        if (!this.hybridStorage) {
          throw new Error('El archivo está en la nube pero el servicio de almacenamiento no está disponible');
        }

        const resultado = await this.hybridStorage.descargarArchivo(documento.ruta_archivo, false);

        if (!resultado.success) {
          throw new Error(`No se pudo descargar el archivo desde la nube: ${resultado.error}`);
        }

        // Guardar temporalmente
        const tempDir = path.join(app.getPath('temp'), 'documentos_temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        rutaArchivoTemporal = path.join(tempDir, documento.nombre_archivo);
        fs.writeFileSync(rutaArchivoTemporal, Buffer.from(await resultado.data.arrayBuffer()));
        console.log(`✅ Archivo descargado temporalmente: ${rutaArchivoTemporal}`);
      } else {
        // Archivo local
        if (!fs.existsSync(documento.ruta_archivo)) {
          throw new Error('El archivo ya no existe en el sistema. Si fue guardado en otra computadora, no está disponible localmente.');
        }
        rutaArchivoTemporal = documento.ruta_archivo;
      }

      // Extraer extensión del archivo original
      const extension = path.extname(documento.nombre_archivo).toLowerCase().replace('.', '');

      // Configurar filtros según el tipo de archivo
      const filters = [];

      // Mapeo de extensiones a nombres descriptivos
      const extensionMap = {
        'pdf': 'Documento PDF',
        'doc': 'Documento Word',
        'docx': 'Documento Word',
        'xls': 'Hoja de Cálculo Excel',
        'xlsx': 'Hoja de Cálculo Excel',
        'jpg': 'Imagen JPEG',
        'jpeg': 'Imagen JPEG',
        'png': 'Imagen PNG',
        'gif': 'Imagen GIF',
        'bmp': 'Imagen BMP',
        'txt': 'Archivo de Texto',
        'zip': 'Archivo Comprimido ZIP',
        'rar': 'Archivo Comprimido RAR',
        '7z': 'Archivo Comprimido 7Z'
      };

      // Agregar filtro específico para la extensión del archivo
      if (extension && extensionMap[extension]) {
        filters.push({
          name: extensionMap[extension],
          extensions: [extension]
        });
      } else if (extension) {
        filters.push({
          name: `Archivo ${extension.toUpperCase()}`,
          extensions: [extension]
        });
      }

      // Agregar filtro de todos los archivos
      filters.push({ name: 'Todos los archivos', extensions: ['*'] });

      // Mostrar diálogo para seleccionar dónde guardar
      const { dialog } = require('electron');
      const { BrowserWindow } = require('electron');

      const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Guardar documento',
        defaultPath: documento.nombre_archivo,
        filters: filters
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          cancelled: true,
          message: 'Descarga cancelada'
        };
      }

      // Asegurarse de que el archivo guardado tenga la extensión correcta
      let rutaFinal = result.filePath;
      if (!rutaFinal.toLowerCase().endsWith(`.${extension}`) && extension) {
        rutaFinal = `${rutaFinal}.${extension}`;
      }

      // Copiar archivo a la ubicación seleccionada
      fs.copyFileSync(rutaArchivoTemporal, rutaFinal);

      // Si era un archivo temporal de Supabase, eliminarlo
      if (documento.ubicacion_almacenamiento === 'SUPABASE' && rutaArchivoTemporal !== documento.ruta_archivo) {
        try {
          fs.unlinkSync(rutaArchivoTemporal);
          console.log('🗑️ Archivo temporal eliminado');
        } catch (err) {
          console.error('Error eliminando archivo temporal:', err);
        }
      }

      return {
        success: true,
        message: 'Documento descargado correctamente',
        ruta_destino: rutaFinal
      };
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

  // Crear nueva persona
  async crearPersona(datos) {
    try {
      this.validateRequired(datos, ['dni', 'nombre']);

      const { dni, nombre, numero } = datos;

      // Verificar si ya existe una persona con ese DNI
      const personaExistente = await this.personaModel.buscarPorDni(dni);
      if (personaExistente) {
        throw new Error('Ya existe una persona con ese DNI');
      }

      const result = await this.personaModel.crear(nombre, dni, numero);

      return {
        success: true,
        persona: {
          id: result.lastID,
          dni,
          nombre,
          numero
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar persona
  async actualizarPersona(datos) {
    try {
      this.validateRequired(datos, ['id', 'dni', 'nombre']);

      const { id, dni, nombre, numero } = datos;

      // Verificar si el DNI ya existe en otra persona
      const personaExistente = await this.personaModel.buscarPorDni(dni);
      if (personaExistente && personaExistente.id !== parseInt(id)) {
        throw new Error('Ya existe otra persona con ese DNI');
      }

      await this.personaModel.actualizar(id, { dni, nombre, numero });

      return {
        success: true,
        persona: {
          id,
          dni,
          nombre,
          numero
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar persona
  async eliminarPersona(id) {
    try {
      this.validateRequired({ id }, ['id']);

      // Verificar si tiene registros asociados
      const tieneRegistros = await this.personaModel.tieneRegistros(id);
      if (tieneRegistros) {
        throw new Error('No se puede eliminar esta persona porque tiene registros asociados');
      }

      await this.personaModel.eliminar(id);

      return {
        success: true,
        message: 'Persona eliminada correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DocumentoPersonaController;

// src/main/controllers/DocumentoPersonaController.js
const BaseController = require('./BaseController');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DocumentoPersonaController extends BaseController {
  constructor(documentoPersonaModel, personaModel) {
    super(documentoPersonaModel);
    this.personaModel = personaModel;

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

  // Subir documento
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

      // Crear directorio para la persona si no existe
      const dirPersona = this.asegurarDirectorioPersona(persona.dni);

      // Generar nombre único para evitar sobrescrituras
      const timestamp = Date.now();
      const extension = path.extname(nombre_archivo);
      const nombreBase = path.basename(nombre_archivo, extension);
      const nombreUnico = `${nombreBase}_${timestamp}${extension}`;
      const rutaDestino = path.join(dirPersona, nombreUnico);

      // Copiar archivo
      fs.copyFileSync(archivo_origen, rutaDestino);

      // Obtener tamaño del archivo
      const stats = fs.statSync(rutaDestino);
      const tamaño_bytes = stats.size;

      // Guardar en base de datos
      const resultado = await this.model.crear({
        persona_id,
        nombre_archivo: nombre_archivo,
        ruta_archivo: rutaDestino,
        tipo_archivo: this.model.obtenerTipoArchivo(nombre_archivo),
        comentario: comentario || '',
        usuario_carga_id: usuario_carga_id || null,
        tamaño_bytes
      });

      // Obtener el documento recién creado
      const documento = await this.model.obtenerPorId(resultado.id);

      return {
        success: true,
        message: 'Documento cargado exitosamente',
        documento,
        id: resultado.id
      };
    } catch (error) {
      this.handleError(error, 'Error subiendo documento');
    }
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

      // Eliminar archivo físico
      if (fs.existsSync(documento.ruta_archivo)) {
        fs.unlinkSync(documento.ruta_archivo);
        console.log(`🗑️ Archivo eliminado: ${documento.ruta_archivo}`);
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

      if (!fs.existsSync(documento.ruta_archivo)) {
        throw new Error('El archivo ya no existe en el sistema');
      }

      // Abrir el archivo con la aplicación predeterminada
      const { shell } = require('electron');
      await shell.openPath(documento.ruta_archivo);

      return {
        success: true,
        message: 'Documento abierto',
        ruta: documento.ruta_archivo
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

      if (!fs.existsSync(documento.ruta_archivo)) {
        throw new Error('El archivo ya no existe en el sistema');
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
      fs.copyFileSync(documento.ruta_archivo, rutaFinal);

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

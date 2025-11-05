// src/main/ipc/DocumentoPersonaIPCHandler.js
const BaseIPCHandler = require('./BaseIPCHandler');
const { dialog } = require('electron');

class DocumentoPersonaIPCHandler extends BaseIPCHandler {
  constructor(documentoPersonaController) {
    super();
    this.documentoPersonaController = documentoPersonaController;
  }

  registerHandlers() {
    // Operaciones de documentos
    this.handle("documento-persona-subir", this, "subirDocumento");
    this.handle("documento-persona-obtener-por-persona", this.documentoPersonaController, "obtenerDocumentosPersona");
    this.handle("documento-persona-eliminar", this.documentoPersonaController, "eliminarDocumento");
    this.handle("documento-persona-abrir", this.documentoPersonaController, "abrirDocumento");
    this.handle("documento-persona-descargar", this.documentoPersonaController, "descargarDocumento");
    this.handle("documento-persona-actualizar-comentario", this.documentoPersonaController, "actualizarComentario");
    this.handle("documento-persona-estadisticas", this.documentoPersonaController, "obtenerEstadisticas");

    // Operaciones de personas (mantener aquí por ahora)
    this.handle("personas-obtener-con-documentos", this.documentoPersonaController, "obtenerPersonasConDocumentos");
    this.handle("personas-buscar", this.documentoPersonaController, "buscarPersonas");
    this.handle("personas-crear", this.documentoPersonaController, "crearPersona");
    this.handle("personas-actualizar", this.documentoPersonaController, "actualizarPersona");
    this.handle("personas-eliminar", this.documentoPersonaController, "eliminarPersona");

    // Handler especial para seleccionar archivo
    this.handle("documento-persona-seleccionar-archivo", this, "seleccionarArchivo");

    console.log("✅ Handlers de Documentos de Persona registrados");
  }

  // Wrapper para subir documento con selección de archivo
  async subirDocumento(datos) {
    try {
      const { persona_id, archivo_origen, nombre_archivo, comentario, usuario } = datos;

      if (!archivo_origen || !nombre_archivo) {
        throw new Error("Se requiere el archivo y su nombre");
      }

      const resultado = await this.documentoPersonaController.subirDocumento({
        persona_id,
        archivo_origen,
        nombre_archivo,
        comentario,
        usuario_carga_id: usuario?.id || null
      });

      return resultado;
    } catch (error) {
      console.error("Error en subirDocumento:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método para abrir el diálogo de selección de archivo
  async seleccionarArchivo() {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Seleccionar Documento',
        properties: ['openFile'],
        filters: [
          { name: 'Documentos', extensions: ['pdf', 'doc', 'docx'] },
          { name: 'Hojas de Cálculo', extensions: ['xls', 'xlsx'] },
          { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          cancelled: true,
          message: 'Selección cancelada'
        };
      }

      const filePath = result.filePaths[0];
      const fileName = require('path').basename(filePath);

      return {
        success: true,
        archivo_origen: filePath,
        nombre_archivo: fileName
      };
    } catch (error) {
      console.error("Error seleccionando archivo:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DocumentoPersonaIPCHandler;

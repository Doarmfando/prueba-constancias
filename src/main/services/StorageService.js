// src/main/services/StorageService.js
const path = require('path');

class StorageService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.bucketName = 'Archivos';
  }

  /**
   * Sube un archivo a Supabase Storage
   * @param {Buffer|File} archivo - Contenido del archivo
   * @param {string} rutaDestino - Ruta donde se guardará el archivo (ej: "personas/12345678/documento.pdf")
   * @param {Object} opciones - Opciones adicionales (contentType, cacheControl, upsert)
   * @returns {Object} - { success, path, url, error }
   */
  async subirArchivo(archivo, rutaDestino, opciones = {}) {
    try {
      const { contentType, cacheControl, upsert = false } = opciones;

      console.log(`📤 [StorageService] Subiendo archivo a: ${rutaDestino}`);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(rutaDestino, archivo, {
          contentType: contentType || 'application/octet-stream',
          cacheControl: cacheControl || '3600',
          upsert: upsert
        });

      if (error) {
        console.error('❌ [StorageService] Error subiendo archivo:', error);
        throw error;
      }

      console.log('✅ [StorageService] Archivo subido exitosamente:', data.path);

      // Obtener URL pública del archivo
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(rutaDestino);

      return {
        success: true,
        path: data.path,
        url: urlData.publicUrl,
        fullPath: data.fullPath
      };
    } catch (error) {
      console.error('❌ [StorageService] Error en subirArchivo:', error);
      return {
        success: false,
        error: error.message || 'Error al subir archivo'
      };
    }
  }

  /**
   * Descarga un archivo desde Supabase Storage
   * @param {string} rutaArchivo - Ruta del archivo en el bucket
   * @returns {Object} - { success, data, error }
   */
  async descargarArchivo(rutaArchivo) {
    try {
      console.log(`📥 [StorageService] Descargando archivo: ${rutaArchivo}`);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(rutaArchivo);

      if (error) {
        console.error('❌ [StorageService] Error descargando archivo:', error);
        throw error;
      }

      console.log('✅ [StorageService] Archivo descargado exitosamente');

      return {
        success: true,
        data: data // Blob
      };
    } catch (error) {
      console.error('❌ [StorageService] Error en descargarArchivo:', error);
      return {
        success: false,
        error: error.message || 'Error al descargar archivo'
      };
    }
  }

  /**
   * Elimina un archivo de Supabase Storage
   * @param {string} rutaArchivo - Ruta del archivo a eliminar
   * @returns {Object} - { success, error }
   */
  async eliminarArchivo(rutaArchivo) {
    try {
      console.log(`🗑️ [StorageService] Eliminando archivo: ${rutaArchivo}`);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([rutaArchivo]);

      if (error) {
        console.error('❌ [StorageService] Error eliminando archivo:', error);
        throw error;
      }

      console.log('✅ [StorageService] Archivo eliminado exitosamente');

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ [StorageService] Error en eliminarArchivo:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar archivo'
      };
    }
  }

  /**
   * Lista archivos en una carpeta
   * @param {string} carpeta - Ruta de la carpeta (ej: "personas/12345678")
   * @param {Object} opciones - Opciones de búsqueda
   * @returns {Object} - { success, files, error }
   */
  async listarArchivos(carpeta = '', opciones = {}) {
    try {
      const { limit = 100, offset = 0, sortBy } = opciones;

      console.log(`📂 [StorageService] Listando archivos en: ${carpeta || '/'}`);

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(carpeta, {
          limit,
          offset,
          sortBy: sortBy || { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ [StorageService] Error listando archivos:', error);
        throw error;
      }

      console.log(`✅ [StorageService] ${data.length} archivos encontrados`);

      return {
        success: true,
        files: data
      };
    } catch (error) {
      console.error('❌ [StorageService] Error en listarArchivos:', error);
      return {
        success: false,
        error: error.message || 'Error al listar archivos',
        files: []
      };
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   * @param {string} rutaArchivo - Ruta del archivo
   * @returns {string} - URL pública
   */
  obtenerUrlPublica(rutaArchivo) {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  /**
   * Obtiene una URL firmada (temporal) para un archivo privado
   * @param {string} rutaArchivo - Ruta del archivo
   * @param {number} expiresIn - Tiempo de expiración en segundos (default: 3600 = 1 hora)
   * @returns {Object} - { success, signedUrl, error }
   */
  async obtenerUrlFirmada(rutaArchivo, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(rutaArchivo, expiresIn);

      if (error) {
        throw error;
      }

      return {
        success: true,
        signedUrl: data.signedUrl
      };
    } catch (error) {
      console.error('❌ [StorageService] Error obteniendo URL firmada:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Genera una ruta única para un archivo
   * @param {string} dni - DNI de la persona
   * @param {string} nombreArchivo - Nombre original del archivo
   * @returns {string} - Ruta única (ej: "personas/12345678/documento_1699999999999.pdf")
   */
  generarRutaUnica(dni, nombreArchivo) {
    const timestamp = Date.now();
    const extension = path.extname(nombreArchivo);
    const nombreBase = path.basename(nombreArchivo, extension);
    const nombreSanitizado = nombreBase.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `personas/${dni}/${nombreSanitizado}_${timestamp}${extension}`;
  }

  /**
   * Mueve un archivo de una ubicación a otra
   * @param {string} rutaOrigen - Ruta actual del archivo
   * @param {string} rutaDestino - Nueva ruta del archivo
   * @returns {Object} - { success, error }
   */
  async moverArchivo(rutaOrigen, rutaDestino) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .move(rutaOrigen, rutaDestino);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ [StorageService] Error moviendo archivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = StorageService;

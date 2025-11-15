// src/main/ipc/StorageIPCHandler.js
const BaseIPCHandler = require('./BaseIPCHandler');

/**
 * Handler IPC para operaciones de almacenamiento híbrido
 * Gestiona comunicación entre frontend y HybridStorageService
 */
class StorageIPCHandler extends BaseIPCHandler {
  constructor(hybridStorageService) {
    super();
    this.storageService = hybridStorageService;
  }

  /**
   * Registrar todos los handlers de storage
   */
  registerHandlers() {
    // Sincronización de archivos pendientes
    this.handleCustom('storage:sincronizar', async () => {
      try {
        console.log('📤 [IPC Storage] Iniciando sincronización de archivos pendientes...');
        const resultado = await this.storageService.sincronizarArchivosPendientes();

        console.log(`✅ [IPC Storage] Sincronización completada: ${resultado.sincronizados} exitosos, ${resultado.fallidos} fallidos`);

        return resultado;
      } catch (error) {
        console.error('❌ [IPC Storage] Error en sincronización:', error);
        return {
          success: false,
          error: error.message,
          sincronizados: 0,
          fallidos: 0
        };
      }
    });

    // Obtener estadísticas de la cola de sincronización
    this.handleCustom('storage:estadisticas-cola', async () => {
      try {
        const stats = this.storageService.obtenerEstadisticasCola();
        return {
          success: true,
          ...stats
        };
      } catch (error) {
        console.error('❌ [IPC Storage] Error obteniendo estadísticas:', error);
        return {
          success: false,
          error: error.message,
          total: 0,
          porTipoError: {}
        };
      }
    });

    // Subir archivo con fallback automático
    this.handleCustom('storage:subir-archivo', async (datos) => {
      try {
        const { archivoBuffer, dni, nombreArchivo, metadata } = datos;

        console.log(`📤 [IPC Storage] Subiendo archivo: ${nombreArchivo} para DNI: ${dni}`);

        // Convertir archivoBuffer de array a Buffer si es necesario
        const buffer = Buffer.isBuffer(archivoBuffer)
          ? archivoBuffer
          : Buffer.from(archivoBuffer);

        const resultado = await this.storageService.subirArchivoConFallback(
          buffer,
          dni,
          nombreArchivo,
          metadata || {}
        );

        console.log(`✅ [IPC Storage] Archivo subido - Ubicación: ${resultado.ubicacion}`);

        return resultado;
      } catch (error) {
        console.error('❌ [IPC Storage] Error subiendo archivo:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Descargar archivo (desde Supabase o local)
    this.handleCustom('storage:descargar-archivo', async (datos) => {
      try {
        const { rutaArchivo, esLocal } = datos;

        console.log(`📥 [IPC Storage] Descargando archivo: ${rutaArchivo}`);

        const resultado = await this.storageService.descargarArchivo(rutaArchivo, esLocal);

        if (resultado.success && resultado.data) {
          // Convertir Blob a Buffer para poder enviarlo por IPC
          let buffer;
          if (resultado.data instanceof Blob) {
            buffer = Buffer.from(await resultado.data.arrayBuffer());
          } else if (Buffer.isBuffer(resultado.data)) {
            buffer = resultado.data;
          } else {
            buffer = Buffer.from(resultado.data);
          }

          return {
            ...resultado,
            data: buffer
          };
        }

        return resultado;
      } catch (error) {
        console.error('❌ [IPC Storage] Error descargando archivo:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Eliminar archivo
    this.handleCustom('storage:eliminar-archivo', async (datos) => {
      try {
        const { rutaArchivo, esLocal } = datos;

        console.log(`🗑️ [IPC Storage] Eliminando archivo: ${rutaArchivo}`);

        const resultado = await this.storageService.eliminarArchivo(rutaArchivo, esLocal);

        console.log(`✅ [IPC Storage] Archivo eliminado`);

        return resultado;
      } catch (error) {
        console.error('❌ [IPC Storage] Error eliminando archivo:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Listar archivos de una persona
    this.handleCustom('storage:listar-archivos', async (datos) => {
      try {
        const { carpeta, opciones } = datos;

        console.log(`📂 [IPC Storage] Listando archivos en: ${carpeta || '/'}`);

        const resultado = await this.storageService.storageService.listarArchivos(
          carpeta,
          opciones || {}
        );

        console.log(`✅ [IPC Storage] ${resultado.files?.length || 0} archivos encontrados`);

        return resultado;
      } catch (error) {
        console.error('❌ [IPC Storage] Error listando archivos:', error);
        return {
          success: false,
          error: error.message,
          files: []
        };
      }
    });

    console.log('✅ [StorageIPCHandler] Handlers de storage registrados');
  }
}

module.exports = StorageIPCHandler;

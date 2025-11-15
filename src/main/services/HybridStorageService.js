// src/main/services/HybridStorageService.js
const StorageService = require('./StorageService');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Servicio Híbrido de Almacenamiento
 * - Intenta subir a Supabase Storage primero
 * - Si falla, guarda localmente como fallback
 * - Mantiene cola de sincronización para reintentar después
 */
class HybridStorageService {
  constructor(supabaseClient) {
    this.storageService = new StorageService(supabaseClient);
    this.supabase = supabaseClient;

    // Configurar rutas locales
    this.documentosBasePath = path.join(app.getPath('userData'), 'documentos', 'personas');
    this.colaPath = path.join(app.getPath('userData'), 'cola-sincronizacion.json');

    // Crear directorios
    this.asegurarDirectorioBase();

    // Cargar cola de sincronización
    this.colaSincronizacion = this.cargarCola();
  }

  /**
   * Asegurar que existe el directorio base
   */
  asegurarDirectorioBase() {
    try {
      if (!fs.existsSync(this.documentosBasePath)) {
        fs.mkdirSync(this.documentosBasePath, { recursive: true });
        console.log(`📁 Directorio local creado: ${this.documentosBasePath}`);
      }
    } catch (error) {
      console.error('Error creando directorio base:', error);
    }
  }

  /**
   * Asegurar directorio para un DNI
   */
  asegurarDirectorioPersona(dni) {
    const dirPersona = path.join(this.documentosBasePath, dni.toString());
    try {
      if (!fs.existsSync(dirPersona)) {
        fs.mkdirSync(dirPersona, { recursive: true });
      }
      return dirPersona;
    } catch (error) {
      console.error(`Error creando directorio para DNI ${dni}:`, error);
      throw error;
    }
  }

  /**
   * Cargar cola de sincronización desde disco
   */
  cargarCola() {
    try {
      if (fs.existsSync(this.colaPath)) {
        const contenido = fs.readFileSync(this.colaPath, 'utf-8');
        return JSON.parse(contenido);
      }
    } catch (error) {
      console.error('Error cargando cola de sincronización:', error);
    }
    return [];
  }

  /**
   * Guardar cola de sincronización a disco
   */
  guardarCola() {
    try {
      fs.writeFileSync(this.colaPath, JSON.stringify(this.colaSincronizacion, null, 2));
    } catch (error) {
      console.error('Error guardando cola de sincronización:', error);
    }
  }

  /**
   * Detectar tipo de error de Supabase
   */
  detectarTipoError(error) {
    const mensajeError = error.message || error.toString();

    // Error de cuota/almacenamiento lleno
    if (mensajeError.includes('storage quota') ||
        mensajeError.includes('insufficient storage') ||
        mensajeError.includes('Payload too large') ||
        mensajeError.includes('413')) {
      return {
        tipo: 'CUOTA_EXCEDIDA',
        mensaje: 'El almacenamiento en la nube está lleno',
        usarLocal: true
      };
    }

    // Error de red/conectividad
    if (mensajeError.includes('network') ||
        mensajeError.includes('fetch') ||
        mensajeError.includes('ENOTFOUND') ||
        mensajeError.includes('timeout')) {
      return {
        tipo: 'SIN_CONEXION',
        mensaje: 'No hay conexión a internet',
        usarLocal: true,
        reintentar: true
      };
    }

    // Error de autenticación
    if (mensajeError.includes('JWT') ||
        mensajeError.includes('unauthorized') ||
        mensajeError.includes('401')) {
      return {
        tipo: 'AUTH_ERROR',
        mensaje: 'Error de autenticación',
        usarLocal: true
      };
    }

    // Error de permisos
    if (mensajeError.includes('permission') ||
        mensajeError.includes('policy') ||
        mensajeError.includes('403')) {
      return {
        tipo: 'PERMISOS',
        mensaje: 'No tienes permisos para subir archivos',
        usarLocal: true
      };
    }

    // Error de archivo muy grande
    if (mensajeError.includes('too large') || mensajeError.includes('size')) {
      return {
        tipo: 'ARCHIVO_GRANDE',
        mensaje: 'El archivo es demasiado grande',
        usarLocal: true
      };
    }

    // Error desconocido
    return {
      tipo: 'DESCONOCIDO',
      mensaje: mensajeError,
      usarLocal: true
    };
  }

  /**
   * Subir archivo con fallback automático
   * @param {Buffer} archivoBuffer - Contenido del archivo
   * @param {string} dni - DNI de la persona
   * @param {string} nombreArchivo - Nombre del archivo
   * @param {Object} metadata - Metadata adicional
   * @returns {Object} - Resultado con información de dónde se guardó
   */
  async subirArchivoConFallback(archivoBuffer, dni, nombreArchivo, metadata = {}) {
    const rutaStorage = this.storageService.generarRutaUnica(dni, nombreArchivo);

    console.log(`📤 [HybridStorage] Intentando subir a Supabase: ${nombreArchivo}`);

    // 1. INTENTAR SUBIR A SUPABASE PRIMERO
    try {
      const resultado = await this.storageService.subirArchivo(
        archivoBuffer,
        rutaStorage,
        {
          contentType: metadata.contentType || 'application/octet-stream',
          upsert: false
        }
      );

      if (resultado.success) {
        console.log('✅ [HybridStorage] Archivo subido a Supabase exitosamente');
        return {
          success: true,
          ubicacion: 'SUPABASE',
          ruta: rutaStorage,
          url: resultado.url,
          mensaje: 'Archivo guardado en la nube'
        };
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.warn('⚠️ [HybridStorage] Fallo al subir a Supabase:', error.message);

      // Detectar tipo de error
      const infoError = this.detectarTipoError(error);

      // 2. GUARDAR LOCALMENTE COMO FALLBACK
      if (infoError.usarLocal) {
        console.log('💾 [HybridStorage] Guardando localmente como fallback...');

        try {
          const dirPersona = this.asegurarDirectorioPersona(dni);
          const timestamp = Date.now();
          const extension = path.extname(nombreArchivo);
          const nombreBase = path.basename(nombreArchivo, extension);
          const nombreUnico = `${nombreBase}_${timestamp}${extension}`;
          const rutaLocal = path.join(dirPersona, nombreUnico);

          // Guardar archivo localmente
          fs.writeFileSync(rutaLocal, archivoBuffer);

          console.log('✅ [HybridStorage] Archivo guardado localmente:', rutaLocal);

          // Si debe reintentar, agregar a la cola de sincronización
          if (infoError.reintentar) {
            this.agregarACola({
              dni,
              nombreArchivo,
              rutaLocal,
              rutaStorage,
              metadata,
              fechaCreacion: new Date().toISOString(),
              intentos: 0,
              tipoError: infoError.tipo
            });
          }

          return {
            success: true,
            ubicacion: 'LOCAL',
            ruta: rutaLocal,
            rutaStorage: rutaStorage, // Guardar para futuro intento
            url: null,
            tipoError: infoError.tipo,
            mensaje: `${infoError.mensaje}. Archivo guardado localmente.`,
            advertencia: true,
            enCola: infoError.reintentar
          };

        } catch (errorLocal) {
          console.error('❌ [HybridStorage] Error guardando localmente:', errorLocal);
          return {
            success: false,
            error: `No se pudo guardar ni en la nube ni localmente: ${errorLocal.message}`
          };
        }
      }

      return {
        success: false,
        error: infoError.mensaje
      };
    }
  }

  /**
   * Agregar archivo a la cola de sincronización
   */
  agregarACola(item) {
    this.colaSincronizacion.push(item);
    this.guardarCola();
    console.log(`📋 [HybridStorage] Archivo agregado a cola de sincronización. Total: ${this.colaSincronizacion.length}`);
  }

  /**
   * Obtener estadísticas de la cola
   */
  obtenerEstadisticasCola() {
    return {
      total: this.colaSincronizacion.length,
      porTipoError: this.colaSincronizacion.reduce((acc, item) => {
        acc[item.tipoError] = (acc[item.tipoError] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Intentar sincronizar archivos pendientes
   * @returns {Object} - Resultado de la sincronización
   */
  async sincronizarArchivosPendientes() {
    if (this.colaSincronizacion.length === 0) {
      return {
        success: true,
        mensaje: 'No hay archivos pendientes de sincronizar',
        sincronizados: 0,
        fallidos: 0
      };
    }

    console.log(`🔄 [HybridStorage] Iniciando sincronización de ${this.colaSincronizacion.length} archivos...`);

    const resultados = {
      sincronizados: 0,
      fallidos: 0,
      detalles: []
    };

    const colaActualizada = [];

    for (const item of this.colaSincronizacion) {
      try {
        // Verificar que el archivo local aún exista
        if (!fs.existsSync(item.rutaLocal)) {
          console.warn(`⚠️ Archivo local no existe: ${item.rutaLocal}`);
          resultados.fallidos++;
          continue;
        }

        // Leer archivo local
        const archivoBuffer = fs.readFileSync(item.rutaLocal);

        // Intentar subir a Supabase
        const resultado = await this.storageService.subirArchivo(
          archivoBuffer,
          item.rutaStorage,
          {
            contentType: item.metadata?.contentType || 'application/octet-stream',
            upsert: false
          }
        );

        if (resultado.success) {
          console.log(`✅ [HybridStorage] Sincronizado: ${item.nombreArchivo}`);

          // Opcional: Eliminar archivo local después de subir exitosamente
          // fs.unlinkSync(item.rutaLocal);

          resultados.sincronizados++;
          resultados.detalles.push({
            archivo: item.nombreArchivo,
            estado: 'sincronizado',
            url: resultado.url
          });
        } else {
          throw new Error(resultado.error);
        }

      } catch (error) {
        console.error(`❌ [HybridStorage] Error sincronizando ${item.nombreArchivo}:`, error.message);

        item.intentos = (item.intentos || 0) + 1;
        item.ultimoError = error.message;
        item.ultimoIntento = new Date().toISOString();

        // Si ha intentado menos de 3 veces, mantener en cola
        if (item.intentos < 3) {
          colaActualizada.push(item);
        }

        resultados.fallidos++;
        resultados.detalles.push({
          archivo: item.nombreArchivo,
          estado: 'fallido',
          intentos: item.intentos,
          error: error.message
        });
      }
    }

    // Actualizar cola con archivos que aún no se han sincronizado
    this.colaSincronizacion = colaActualizada;
    this.guardarCola();

    console.log(`✅ [HybridStorage] Sincronización completada: ${resultados.sincronizados} exitosos, ${resultados.fallidos} fallidos`);

    return {
      success: true,
      ...resultados,
      pendientes: this.colaSincronizacion.length
    };
  }

  /**
   * Descargar archivo (intenta desde Supabase primero, luego local)
   */
  async descargarArchivo(rutaArchivo, esLocal = false) {
    if (esLocal || !rutaArchivo.startsWith('personas/')) {
      // Es una ruta local
      try {
        if (fs.existsSync(rutaArchivo)) {
          const buffer = fs.readFileSync(rutaArchivo);
          return {
            success: true,
            data: buffer,
            ubicacion: 'LOCAL'
          };
        }
      } catch (error) {
        console.error('Error leyendo archivo local:', error);
      }
    }

    // Intentar descargar desde Supabase
    const resultado = await this.storageService.descargarArchivo(rutaArchivo);
    if (resultado.success) {
      resultado.ubicacion = 'SUPABASE';
    }
    return resultado;
  }

  /**
   * Eliminar archivo (de ambas ubicaciones si es necesario)
   */
  async eliminarArchivo(rutaArchivo, esLocal = false) {
    const resultados = {
      supabase: null,
      local: null,
      success: false
    };

    // Intentar eliminar de Supabase
    if (!esLocal && rutaArchivo.startsWith('personas/')) {
      resultados.supabase = await this.storageService.eliminarArchivo(rutaArchivo);
      if (resultados.supabase.success) {
        resultados.success = true;
      }
    }

    // Intentar eliminar localmente
    if (esLocal || fs.existsSync(rutaArchivo)) {
      try {
        fs.unlinkSync(rutaArchivo);
        resultados.local = { success: true };
        resultados.success = true;
      } catch (error) {
        resultados.local = { success: false, error: error.message };
      }
    }

    return resultados;
  }
}

module.exports = HybridStorageService;

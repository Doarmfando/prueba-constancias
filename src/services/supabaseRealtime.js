// src/services/supabaseRealtime.js
// Servicio de Supabase Realtime para suscripciones en tiempo real

// Importar cliente de Supabase para navegador
import { supabaseUser } from '../config/supabaseBrowser';

// Tablas base usadas en realtime
export const TABLA_PROYECTOS = 'proyectos_registros';

/**
 * Suscribe a cambios en tiempo real de una tabla
 * @param {string} tabla - Nombre de la tabla a suscribir
 * @param {Function} callback - Función que se ejecuta cuando hay cambios
 * @param {Object} filtros - Filtros opcionales para la suscripción
 * @returns {Object} Canal de suscripción que puede ser usado para darse de baja
 */
export const suscribirseATabla = (tabla, callback, filtros = {}) => {
  // Verificar que el cliente de Supabase esté disponible
  if (!supabaseUser) {
    console.warn(`⚠️ No se puede suscribir a ${tabla}: Cliente de Supabase no inicializado`);
    return null;
  }

  try {
    // Crear un canal único para esta suscripción
    const channelName = `realtime:${tabla}:${Date.now()}`;

    let channel = supabaseUser
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: tabla,
          ...filtros
        },
        (payload) => {
          console.log(`🔄 Cambio detectado en ${tabla}:`, payload);

          // Callback con información del evento
          callback({
            tipo: payload.eventType, // 'INSERT', 'UPDATE', 'DELETE'
            nuevo: payload.new, // Datos nuevos (INSERT/UPDATE)
            viejo: payload.old, // Datos anteriores (UPDATE/DELETE)
            tabla: tabla,
            timestamp: new Date()
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Suscrito a cambios en tiempo real de ${tabla}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error al suscribirse a ${tabla}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Timeout al suscribirse a ${tabla}`);
        } else if (status === 'CLOSED') {
          console.log(`🔒 Canal cerrado para ${tabla}`);
        }
      });

    return channel;
  } catch (error) {
    console.error(`Error al suscribirse a tabla ${tabla}:`, error);
    return null;
  }
};

/**
 * Cancela una suscripción activa
 * @param {Object} channel - Canal de suscripción a cancelar
 */
export const cancelarSuscripcion = async (channel) => {
  if (!channel) return;

  try {
    await supabaseUser.removeChannel(channel);
    console.log('✅ Suscripción cancelada correctamente');
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
  }
};

/**
 * Suscribe a múltiples tablas con un solo callback
 * @param {Array<string>} tablas - Array de nombres de tablas
 * @param {Function} callback - Función que se ejecuta cuando hay cambios
 * @returns {Array<Object>} Array de canales de suscripción
 */
export const suscribirseAMultiplesTablas = (tablas, callback) => {
  const canales = tablas.map(tabla =>
    suscribirseATabla(tabla, callback)
  );

  return canales;
};

/**
 * Cancela múltiples suscripciones
 * @param {Array<Object>} canales - Array de canales a cancelar
 */
export const cancelarMultiplesSuscripciones = async (canales) => {
  if (!canales || canales.length === 0) return;

  try {
    await Promise.all(
      canales.map(canal => cancelarSuscripcion(canal))
    );
    console.log('✅ Todas las suscripciones canceladas');
  } catch (error) {
    console.error('Error al cancelar suscripciones:', error);
  }
};

/**
 * Hook helper para suscribirse a cambios de una tabla específica
 * con filtros específicos (ej: por proyecto, por usuario, etc)
 */
export const suscribirseConFiltro = (tabla, filtro, callback) => {
  // Filtros soportados:
  // - filter: 'column=eq.value' (columna igual a valor)
  // - filter: 'column=neq.value' (columna distinta a valor)
  // - filter: 'column=gt.value' (columna mayor que valor)
  // - filter: 'column=lt.value' (columna menor que valor)

  return suscribirseATabla(tabla, callback, { filter: filtro });
};

/**
 * Configuración de suscripciones por módulo
 */
export const SUSCRIPCIONES_MODULOS = {
  personas: {
    tabla: 'personas',
    eventos: ['INSERT', 'UPDATE', 'DELETE']
  },
  registros: {
    tabla: 'registros',
    eventos: ['INSERT', 'UPDATE', 'DELETE']
  },
  proyectos: {
    tabla: TABLA_PROYECTOS,
    eventos: ['INSERT', 'UPDATE', 'DELETE']
  },
  documentos_persona: {
    tabla: 'documentos_persona',
    eventos: ['INSERT', 'UPDATE', 'DELETE']
  },
  usuarios: {
    tabla: 'usuarios',
    eventos: ['INSERT', 'UPDATE', 'DELETE']
  },
  auditoria: {
    tabla: 'auditoria',
    eventos: ['INSERT']
  }
};

/**
 * Verificar si Supabase Realtime está disponible
 */
export const verificarRealtimeDisponible = () => {
  try {
    if (!supabaseUser) {
      return false;
    }
    return typeof supabaseUser.channel === 'function';
  } catch {
    return false;
  }
};

export default {
  suscribirseATabla,
  cancelarSuscripcion,
  suscribirseAMultiplesTablas,
  cancelarMultiplesSuscripciones,
  suscribirseConFiltro,
  verificarRealtimeDisponible,
  SUSCRIPCIONES_MODULOS,
  TABLA_PROYECTOS
};

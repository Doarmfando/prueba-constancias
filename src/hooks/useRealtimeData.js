// src/hooks/useRealtimeData.js
// Hook personalizado para manejar datos en tiempo real con Supabase

import { useEffect, useRef, useState } from 'react';
import { suscribirseATabla, cancelarSuscripcion } from '../services/supabaseRealtime';
import { supabaseUser } from '../config/supabaseBrowser';

/**
 * Hook para suscribirse a cambios en tiempo real de una tabla
 * @param {string} tabla - Nombre de la tabla de Supabase
 * @param {Function} onDataChange - Callback que se ejecuta cuando hay cambios
 * @param {Object} opciones - Opciones de configuración
 * @returns {Object} Estado de la suscripción
 */
export const useRealtimeData = (tabla, onDataChange, opciones = {}) => {
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState(null);
  const canalRef = useRef(null);
  const {
    habilitado = true, // Permite habilitar/deshabilitar la suscripción
    filtros = {},
    debounceMs = 0, // Tiempo de espera antes de ejecutar el callback (evita múltiples llamadas)
  } = opciones;

  useEffect(() => {
    const puedeRealtime = habilitado && (window.__WEB_BRIDGE__ || supabaseUser);
    // Solo suscribirse si está habilitado y hay cliente Supabase disponible
    if (!puedeRealtime) {
      return;
    }

    let timeoutId = null;

    const handleChange = (evento) => {
      // Si hay debounce, esperar antes de ejecutar
      if (debounceMs > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onDataChange(evento);
        }, debounceMs);
      } else {
        onDataChange(evento);
      }
    };

    try {
      setError(null);
      console.log(`🔌 Intentando conectar a ${tabla}...`);

      canalRef.current = suscribirseATabla(tabla, handleChange, filtros);

      if (canalRef.current) {
        setConectado(true);
      } else {
        setError('No se pudo crear la suscripción');
      }
    } catch (err) {
      console.error(`Error en suscripción a ${tabla}:`, err);
      setError(err.message);
      setConectado(false);
    }

    // Cleanup: cancelar suscripción cuando el componente se desmonta
    return () => {
      if (timeoutId) clearTimeout(timeoutId);

      if (canalRef.current) {
        console.log(`🔌 Desconectando de ${tabla}...`);
        cancelarSuscripcion(canalRef.current);
        canalRef.current = null;
        setConectado(false);
      }
    };
  }, [tabla, habilitado, JSON.stringify(filtros), debounceMs]);

  return {
    conectado,
    error,
    canal: canalRef.current
  };
};

/**
 * Hook para recargar datos automáticamente cuando hay cambios
 * @param {string} tabla - Nombre de la tabla
 * @param {Function} cargarDatos - Función para cargar los datos
 * @param {Object} opciones - Opciones de configuración
 * @returns {Object} Estado de la sincronización
 */
export const useRealtimeSync = (tabla, cargarDatos, opciones = {}) => {
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [contadorCambios, setContadorCambios] = useState(0);

  const {
    habilitado = true,
    debounceMs = 500, // Por defecto 500ms de debounce
    filtros = {},
    onCambio = null, // Callback adicional cuando hay cambios
    fallbackIntervalMs = null // Polling pasivo opcional (desactivado por defecto para evitar parpadeos)
  } = opciones;

  const handleDataChange = async (evento) => {
    console.log(`📡 Cambio detectado en ${tabla}:`, evento.tipo);

    setContadorCambios(prev => prev + 1);
    setUltimaActualizacion(new Date());

    // Ejecutar callback adicional si existe
    if (onCambio) {
      onCambio(evento);
    }

    // Recargar datos
    try {
      setSincronizando(true);
      if (typeof cargarDatos === 'function') {
        await cargarDatos();
      } else {
        console.warn(`useRealtimeSync: cargarDatos no es función para tabla ${tabla}`);
      }
    } catch (error) {
      console.error('Error recargando datos:', error);
    } finally {
      setSincronizando(false);
    }
  };

  const { conectado, error } = useRealtimeData(
    tabla,
    handleDataChange,
    { habilitado, filtros, debounceMs }
  );

  // Polling pasivo opcional para asegurar refresco aunque Realtime falle o tarde
  useEffect(() => {
    if (!habilitado || !fallbackIntervalMs) return;
    if (!cargarDatos || typeof cargarDatos !== 'function') return;

    let pollingId = null;

    const hacerPolling = async () => {
      try {
        setSincronizando(true);
        await cargarDatos();
        setUltimaActualizacion(new Date());
      } catch (err) {
        console.error('Polling fallback error:', err);
      } finally {
        setSincronizando(false);
      }
    };

    // Activar polling como seguro pasivo (solo si se configura fallbackIntervalMs)
    hacerPolling();
    pollingId = setInterval(hacerPolling, fallbackIntervalMs);

    return () => {
      if (pollingId) clearInterval(pollingId);
    };
  }, [habilitado, fallbackIntervalMs, cargarDatos]);

  return {
    conectado,
    error,
    sincronizando,
    ultimaActualizacion,
    contadorCambios
  };
};

/**
 * Hook para suscribirse a múltiples tablas
 * @param {Array<{tabla: string, callback: Function}>} suscripciones
 * @param {Object} opciones
 * @returns {Object} Estado de las suscripciones
 */
export const useRealtimeMultiple = (suscripciones, opciones = {}) => {
  const [estados, setEstados] = useState({});
  const { habilitado = true } = opciones;

  useEffect(() => {
    const puedeRealtime = habilitado && (window.__WEB_BRIDGE__ || supabaseUser);
    if (!puedeRealtime) {
      return;
    }

    const canales = suscripciones.map(({ tabla, callback, filtros }) => {
      const canal = suscribirseATabla(tabla, callback, filtros);

      setEstados(prev => ({
        ...prev,
        [tabla]: { conectado: !!canal, error: null }
      }));

      return { tabla, canal };
    });

    return () => {
      canales.forEach(({ tabla, canal }) => {
        if (canal) {
          cancelarSuscripcion(canal);
          setEstados(prev => ({
            ...prev,
            [tabla]: { conectado: false, error: null }
          }));
        }
      });
    };
  }, [habilitado, JSON.stringify(suscripciones)]);

  return estados;
};

/**
 * Hook para mostrar notificaciones cuando hay cambios en tiempo real
 * @param {string} tabla - Nombre de la tabla
 * @param {Object} opciones - Opciones de configuración
 * @returns {Object} Estado de la suscripción
 */
export const useRealtimeNotifications = (tabla, opciones = {}) => {
  const {
    habilitado = true,
    mostrarInsert = true,
    mostrarUpdate = true,
    mostrarDelete = true,
    mensajes = {
      insert: 'Nuevo registro agregado',
      update: 'Registro actualizado',
      delete: 'Registro eliminado'
    },
    onNotificacion = null
  } = opciones;

  const handleChange = (evento) => {
    let mensaje = null;

    switch (evento.tipo) {
      case 'INSERT':
        if (mostrarInsert) mensaje = mensajes.insert;
        break;
      case 'UPDATE':
        if (mostrarUpdate) mensaje = mensajes.update;
        break;
      case 'DELETE':
        if (mostrarDelete) mensaje = mensajes.delete;
        break;
    }

    if (mensaje && onNotificacion) {
      onNotificacion({ mensaje, evento });
    }
  };

  return useRealtimeData(tabla, handleChange, { habilitado });
};

export default {
  useRealtimeData,
  useRealtimeSync,
  useRealtimeMultiple,
  useRealtimeNotifications
};

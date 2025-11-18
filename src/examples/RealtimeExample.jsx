// src/examples/RealtimeExample.jsx
// Ejemplos de uso de Supabase Realtime en diferentes casos

import React, { useState, useEffect } from 'react';
import { useRealtimeSync, useRealtimeData, useRealtimeMultiple } from '../hooks/useRealtimeData';
import { toast } from 'react-toastify';

/**
 * EJEMPLO 1: Sincronización automática simple
 * Caso de uso: Lista de registros que se actualiza automáticamente
 */
export function RegistrosConRealtime() {
  const [registros, setRegistros] = useState([]);

  const cargarRegistros = async () => {
    const response = await window.electronAPI?.registros.obtener();
    if (response?.success) {
      setRegistros(response.registros || []);
    }
  };

  // Sincronización automática
  const { conectado, sincronizando } = useRealtimeSync(
    'registros',
    cargarRegistros,
    {
      habilitado: window.__WEB_BRIDGE__ === true,
      debounceMs: 500,
      onCambio: (evento) => {
        console.log('Cambio en registros:', evento);
        toast.info(`Registro ${evento.tipo.toLowerCase()}`);
      }
    }
  );

  useEffect(() => {
    cargarRegistros();
  }, []);

  return (
    <div>
      <h2>Registros {conectado && '🟢 En vivo'}</h2>
      {sincronizando && <p>Sincronizando...</p>}
      <ul>
        {registros.map(reg => (
          <li key={reg.id}>{reg.nombre}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * EJEMPLO 2: Suscripción manual con control personalizado
 * Caso de uso: Dashboard con métricas que se actualizan en tiempo real
 */
export function DashboardConRealtime() {
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    nuevosHoy: 0
  });

  const actualizarEstadisticas = (evento) => {
    console.log('Evento recibido:', evento);

    // Actualizar estadísticas según el tipo de evento
    if (evento.tipo === 'INSERT') {
      setEstadisticas(prev => ({
        ...prev,
        total: prev.total + 1,
        nuevosHoy: prev.nuevosHoy + 1
      }));
    } else if (evento.tipo === 'DELETE') {
      setEstadisticas(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
    }
  };

  const { conectado } = useRealtimeData(
    'registros',
    actualizarEstadisticas,
    {
      habilitado: true,
      debounceMs: 0 // Sin debounce para actualizaciones instantáneas
    }
  );

  return (
    <div>
      <h2>Dashboard {conectado && '🟢'}</h2>
      <div>
        <p>Total: {estadisticas.total}</p>
        <p>Nuevos hoy: {estadisticas.nuevosHoy}</p>
      </div>
    </div>
  );
}

/**
 * EJEMPLO 3: Múltiples suscripciones
 * Caso de uso: Vista que necesita sincronizar varias tablas
 */
export function VistaMultipleRealtime() {
  const [personas, setPersonas] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  const cargarPersonas = async () => {
    const response = await window.electronAPI?.personas.obtenerConDocumentos();
    if (response?.success) setPersonas(response.personas || []);
  };

  const cargarProyectos = async () => {
    const response = await window.electronAPI?.proyectos.obtenerProyectosPublicos();
    if (response?.success) setProyectos(response.proyectos || []);
  };

  // Suscripciones múltiples
  const estados = useRealtimeMultiple(
    [
      {
        tabla: 'personas',
        callback: () => cargarPersonas(),
        filtros: {}
      },
      {
        tabla: 'proyectos',
        callback: () => cargarProyectos(),
        filtros: {}
      }
    ],
    { habilitado: window.__WEB_BRIDGE__ === true }
  );

  useEffect(() => {
    cargarPersonas();
    cargarProyectos();
  }, []);

  return (
    <div>
      <h2>Vista Múltiple</h2>
      <div>
        <h3>Personas {estados.personas?.conectado && '🟢'}</h3>
        <p>{personas.length} personas</p>
      </div>
      <div>
        <h3>Proyectos {estados.proyectos?.conectado && '🟢'}</h3>
        <p>{proyectos.length} proyectos</p>
      </div>
    </div>
  );
}

/**
 * EJEMPLO 4: Realtime con filtros específicos
 * Caso de uso: Solo escuchar cambios de un proyecto específico
 */
export function ProyectoDetalleRealtime({ proyectoId }) {
  const [registros, setRegistros] = useState([]);

  const cargarRegistrosProyecto = async () => {
    const response = await window.electronAPI?.registros.obtenerPorProyecto(proyectoId);
    if (response?.success) {
      setRegistros(response.registros || []);
    }
  };

  // Solo sincronizar registros de este proyecto
  const { conectado } = useRealtimeSync(
    'registros',
    cargarRegistrosProyecto,
    {
      habilitado: window.__WEB_BRIDGE__ === true,
      // Filtrar solo registros de este proyecto
      filtros: {
        filter: `proyecto_id=eq.${proyectoId}`
      },
      debounceMs: 300
    }
  );

  useEffect(() => {
    cargarRegistrosProyecto();
  }, [proyectoId]);

  return (
    <div>
      <h2>Registros del Proyecto {conectado && '🟢'}</h2>
      <ul>
        {registros.map(reg => (
          <li key={reg.id}>{reg.nombre}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * EJEMPLO 5: Control manual de suscripción
 * Caso de uso: Habilitar/deshabilitar realtime según preferencia del usuario
 */
export function ComponenteConToggleRealtime() {
  const [datos, setDatos] = useState([]);
  const [realtimeHabilitado, setRealtimeHabilitado] = useState(true);

  const cargarDatos = async () => {
    const response = await window.electronAPI?.personas.obtenerConDocumentos();
    if (response?.success) setDatos(response.personas || []);
  };

  const { conectado, sincronizando } = useRealtimeSync(
    'personas',
    cargarDatos,
    {
      habilitado: realtimeHabilitado && window.__WEB_BRIDGE__ === true,
      debounceMs: 500
    }
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <div>
      <h2>Control de Realtime</h2>

      <div>
        <label>
          <input
            type="checkbox"
            checked={realtimeHabilitado}
            onChange={(e) => setRealtimeHabilitado(e.target.checked)}
          />
          Sincronización automática {conectado && '🟢'}
        </label>
      </div>

      {sincronizando && <p>Sincronizando datos...</p>}

      <button onClick={cargarDatos}>
        Recargar manualmente
      </button>

      <ul>
        {datos.map(item => (
          <li key={item.id}>{item.nombre}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * EJEMPLO 6: Notificaciones personalizadas
 * Caso de uso: Mostrar diferentes tipos de notificaciones según el evento
 */
export function NotificacionesRealtimePersonalizadas() {
  const [registros, setRegistros] = useState([]);

  const cargarRegistros = async () => {
    const response = await window.electronAPI?.registros.obtener();
    if (response?.success) {
      setRegistros(response.registros || []);
    }
  };

  const { conectado } = useRealtimeSync(
    'registros',
    cargarRegistros,
    {
      habilitado: window.__WEB_BRIDGE__ === true,
      onCambio: (evento) => {
        // Notificaciones personalizadas según el evento
        switch (evento.tipo) {
          case 'INSERT':
            toast.success(`✨ Nuevo registro: ${evento.nuevo?.nombre || 'Sin nombre'}`, {
              icon: '✨',
              autoClose: 3000
            });
            break;

          case 'UPDATE':
            toast.info(`🔄 Registro actualizado: ${evento.nuevo?.nombre || 'Sin nombre'}`, {
              icon: '🔄',
              autoClose: 2000
            });
            break;

          case 'DELETE':
            toast.warning(`🗑️ Registro eliminado`, {
              icon: '🗑️',
              autoClose: 2000
            });
            break;
        }
      }
    }
  );

  useEffect(() => {
    cargarRegistros();
  }, []);

  return (
    <div>
      <h2>Registros con Notificaciones {conectado && '🟢'}</h2>
      <p>Abre otra pestaña y agrega/edita/elimina registros para ver las notificaciones</p>
      <ul>
        {registros.map(reg => (
          <li key={reg.id}>{reg.nombre}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * EJEMPLO 7: Solo escuchar eventos específicos
 * Caso de uso: Solo recibir notificaciones de inserciones, no de actualizaciones
 */
export function SoloNuevosRegistros() {
  const [ultimoRegistro, setUltimoRegistro] = useState(null);

  const handleNuevoRegistro = (evento) => {
    if (evento.tipo === 'INSERT') {
      setUltimoRegistro(evento.nuevo);
      toast.success(`🎉 Nuevo registro: ${evento.nuevo.nombre}`);
    }
  };

  const { conectado } = useRealtimeData(
    'registros',
    handleNuevoRegistro,
    {
      habilitado: window.__WEB_BRIDGE__ === true
    }
  );

  return (
    <div>
      <h2>Monitor de Nuevos Registros {conectado && '🟢'}</h2>
      {ultimoRegistro && (
        <div className="alert">
          <p>Último registro agregado:</p>
          <p><strong>{ultimoRegistro.nombre}</strong></p>
          <p>Hace {new Date(ultimoRegistro.fecha_creacion).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

// Exportar todos los ejemplos
export default {
  RegistrosConRealtime,
  DashboardConRealtime,
  VistaMultipleRealtime,
  ProyectoDetalleRealtime,
  ComponenteConToggleRealtime,
  NotificacionesRealtimePersonalizadas,
  SoloNuevosRegistros
};

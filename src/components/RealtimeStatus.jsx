// src/components/RealtimeStatus.jsx
// Componente para mostrar el estado de Supabase Realtime

import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaSync, FaPlug } from 'react-icons/fa';
import { verificarRealtimeDisponible } from '../services/supabaseRealtime';

/**
 * Badge de estado de Realtime que se puede usar en cualquier componente
 */
export function RealtimeBadge({ conectado, sincronizando, className = '' }) {
  if (!window.__WEB_BRIDGE__) {
    return null; // No mostrar en modo Electron
  }

  if (sincronizando) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs ${className}`}>
        <FaSync className="animate-spin" />
        Sincronizando
      </span>
    );
  }

  if (conectado) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs ${className}`}>
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        En vivo
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs ${className}`}>
      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
      Sin conexión
    </span>
  );
}

/**
 * Panel de diagnóstico de Realtime
 * Útil para debugging y verificar que todo funciona
 */
export function RealtimeDiagnostics() {
  const [estado, setEstado] = useState({
    disponible: false,
    modoWeb: false,
    canales: [],
    ultimaVerificacion: null
  });

  const verificarEstado = () => {
    const disponible = verificarRealtimeDisponible();
    const modoWeb = window.__WEB_BRIDGE__ === true;

    setEstado({
      disponible,
      modoWeb,
      canales: [],
      ultimaVerificacion: new Date()
    });
  };

  useEffect(() => {
    verificarEstado();

    // Verificar cada 5 segundos
    const interval = setInterval(verificarEstado, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!window.__WEB_BRIDGE__) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FaTimesCircle className="text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Modo Electron</p>
            <p className="text-sm text-yellow-700">
              Realtime solo está disponible en modo web. Ejecuta <code className="bg-yellow-100 px-1 rounded">npm run web</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FaPlug className="text-blue-600" />
          Estado de Realtime
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Estado general */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Realtime disponible</span>
          {estado.disponible ? (
            <FaCheckCircle className="text-green-500" />
          ) : (
            <FaTimesCircle className="text-red-500" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Modo web activo</span>
          {estado.modoWeb ? (
            <FaCheckCircle className="text-green-500" />
          ) : (
            <FaTimesCircle className="text-red-500" />
          )}
        </div>

        {/* Información de la última verificación */}
        {estado.ultimaVerificacion && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Última verificación: {estado.ultimaVerificacion.toLocaleTimeString()}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <p className="font-medium text-blue-900 mb-2">¿Cómo verificar que funciona?</p>
          <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Abre dos pestañas del navegador</li>
            <li>En una pestaña, ve a "Personas"</li>
            <li>En la otra pestaña, agrega una persona</li>
            <li>La primera pestaña se actualizará automáticamente</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente compacto de estado para el navbar
 */
export function RealtimeNavStatus({ className = '' }) {
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const verificar = () => {
      setConectado(verificarRealtimeDisponible() && window.__WEB_BRIDGE__ === true);
    };

    verificar();
    const interval = setInterval(verificar, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!window.__WEB_BRIDGE__) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
      <span className="text-gray-600">
        {conectado ? 'En vivo' : 'Desconectado'}
      </span>
    </div>
  );
}

/**
 * Indicador de última actualización
 */
export function UltimaActualizacion({ timestamp, className = '' }) {
  if (!timestamp || !window.__WEB_BRIDGE__) {
    return null;
  }

  return (
    <span className={`text-xs text-gray-500 ${className}`}>
      Última actualización: {timestamp.toLocaleTimeString()}
    </span>
  );
}

/**
 * Componente de prueba completo
 */
export function RealtimeTestPanel() {
  const [eventos, setEventos] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    inserciones: 0,
    actualizaciones: 0,
    eliminaciones: 0
  });

  const agregarEvento = (evento) => {
    setEventos(prev => [
      {
        ...evento,
        timestamp: new Date(),
        id: Date.now()
      },
      ...prev.slice(0, 9) // Mantener solo los últimos 10 eventos
    ]);

    // Actualizar estadísticas
    setEstadisticas(prev => ({
      ...prev,
      inserciones: evento.tipo === 'INSERT' ? prev.inserciones + 1 : prev.inserciones,
      actualizaciones: evento.tipo === 'UPDATE' ? prev.actualizaciones + 1 : prev.actualizaciones,
      eliminaciones: evento.tipo === 'DELETE' ? prev.eliminaciones + 1 : prev.eliminaciones
    }));
  };

  const limpiarEventos = () => {
    setEventos([]);
    setEstadisticas({
      inserciones: 0,
      actualizaciones: 0,
      eliminaciones: 0
    });
  };

  return (
    <div className="space-y-6">
      <RealtimeDiagnostics />

      {/* Estadísticas */}
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Eventos Capturados</h3>
          <button
            onClick={limpiarEventos}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Limpiar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{estadisticas.inserciones}</div>
            <div className="text-xs text-gray-600">Inserciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{estadisticas.actualizaciones}</div>
            <div className="text-xs text-gray-600">Actualizaciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{estadisticas.eliminaciones}</div>
            <div className="text-xs text-gray-600">Eliminaciones</div>
          </div>
        </div>

        {/* Lista de eventos */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {eventos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay eventos recientes. Haz cambios en otra pestaña para verlos aquí.
            </div>
          ) : (
            eventos.map(evento => (
              <div
                key={evento.id}
                className={`p-3 rounded border-l-4 ${
                  evento.tipo === 'INSERT' ? 'bg-green-50 border-green-500' :
                  evento.tipo === 'UPDATE' ? 'bg-blue-50 border-blue-500' :
                  'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {evento.tipo}
                  </span>
                  <span className="text-xs text-gray-500">
                    {evento.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Tabla: {evento.tabla}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default {
  RealtimeBadge,
  RealtimeDiagnostics,
  RealtimeNavStatus,
  UltimaActualizacion,
  RealtimeTestPanel
};

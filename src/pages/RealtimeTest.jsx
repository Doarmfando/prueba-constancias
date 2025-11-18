// src/pages/RealtimeTest.jsx
// Página de pruebas de Supabase Realtime

import React from 'react';
import { FaPlug, FaCheckCircle } from 'react-icons/fa';
import { RealtimeDiagnostics, RealtimeTestPanel } from '../components/RealtimeStatus';

function RealtimeTest() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaPlug className="text-blue-600" />
          Prueba de Realtime
        </h1>
        <p className="text-gray-600 mt-1">
          Verifica y prueba la sincronización en tiempo real con Supabase
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <FaCheckCircle />
          Cómo probar Realtime
        </h3>
        <ol className="text-blue-800 space-y-2 ml-6 list-decimal">
          <li>
            <strong>Paso 1:</strong> Asegúrate de haber ejecutado el script SQL en Supabase
            <br />
            <code className="bg-blue-100 px-2 py-0.5 rounded text-sm">supabase-realtime-setup.sql</code>
          </li>
          <li>
            <strong>Paso 2:</strong> Verifica que estás en modo web
            <br />
            <code className="bg-blue-100 px-2 py-0.5 rounded text-sm">npm run web</code>
          </li>
          <li>
            <strong>Paso 3:</strong> Abre dos pestañas del navegador en esta aplicación
          </li>
          <li>
            <strong>Paso 4:</strong> En una pestaña, ve a "Personas" y agrega una persona
          </li>
          <li>
            <strong>Paso 5:</strong> Observa cómo la otra pestaña se actualiza automáticamente
          </li>
        </ol>
      </div>

      {/* Panel de diagnóstico */}
      <RealtimeDiagnostics />

      {/* Panel de prueba */}
      {window.__WEB_BRIDGE__ && <RealtimeTestPanel />}

      {/* Información adicional */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Información del Sistema</h3>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Modo de ejecución</span>
            <span className="font-medium text-gray-900">
              {window.__WEB_BRIDGE__ ? '🌐 Web' : '💻 Electron'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Realtime disponible</span>
            <span className="font-medium text-gray-900">
              {window.__WEB_BRIDGE__ ? '✅ Sí' : '❌ No (solo en modo web)'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Supabase URL</span>
            <span className="font-medium text-gray-900 truncate max-w-xs">
              {process.env.SUPABASE_URL || 'No configurado'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600">Variables de entorno</span>
            <span className="font-medium text-gray-900">
              {process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? '✅ Configuradas' : '❌ Faltantes'}
            </span>
          </div>
        </div>
      </div>

      {/* Guía rápida */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Guía Rápida</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📚 Documentación</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <code>SUPABASE_REALTIME_SETUP.md</code> - Guía completa de configuración</li>
              <li>• <code>REALTIME_IMPLEMENTADO.md</code> - Resumen de la implementación</li>
              <li>• <code>src/examples/RealtimeExample.jsx</code> - Ejemplos de código</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔧 Archivos Principales</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <code>src/services/supabaseRealtime.js</code> - Servicio de Realtime</li>
              <li>• <code>src/hooks/useRealtimeData.js</code> - Hooks de React</li>
              <li>• <code>src/components/RealtimeStatus.jsx</code> - Componentes UI</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">✅ Componentes Activos</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <code>src/pages/Personas.jsx</code> - Realtime implementado</li>
              <li>• <code>src/pages/ProyectosPublicos.jsx</code> - Realtime implementado</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎯 Tablas Configuradas</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• <code>personas</code> - INSERT, UPDATE, DELETE</li>
              <li>• <code>proyectos</code> - INSERT, UPDATE, DELETE</li>
              <li>• <code>registros</code> - INSERT, UPDATE, DELETE</li>
              <li>• <code>documentos_persona</code> - INSERT, UPDATE, DELETE</li>
              <li>• <code>usuarios</code> - INSERT, UPDATE</li>
              <li>• <code>auditoria</code> - INSERT</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Comandos útiles */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">🛠️ Comandos Útiles</h3>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Iniciar modo web:</p>
            <code className="block bg-gray-100 px-3 py-2 rounded text-sm">npm run web</code>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Verificar en consola del navegador:</p>
            <code className="block bg-gray-100 px-3 py-2 rounded text-sm">
              window.__WEB_BRIDGE__ // Debe ser true
            </code>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">SQL en Supabase:</p>
            <code className="block bg-gray-100 px-3 py-2 rounded text-sm whitespace-pre-wrap">
              {`SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealtimeTest;

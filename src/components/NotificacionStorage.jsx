import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCloudUploadAlt, FaCheckCircle, FaTimes, FaSync } from 'react-icons/fa';

/**
 * Componente para mostrar notificaciones sobre el estado del almacenamiento
 * - Muestra cuando un archivo se guardó localmente por falta de espacio
 * - Permite intentar sincronizar archivos pendientes
 */
function NotificacionStorage({ mostrar, onCerrar, datos }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const {
    tipo = 'CUOTA_EXCEDIDA', // CUOTA_EXCEDIDA, SIN_CONEXION, ARCHIVO_GRANDE, etc.
    mensaje = '',
    nombreArchivo = '',
    enCola = false,
    archivosEnCola = 0
  } = datos || {};

  const obtenerIcono = () => {
    switch (tipo) {
      case 'CUOTA_EXCEDIDA':
        return <FaExclamationTriangle className="text-orange-500 text-3xl" />;
      case 'SIN_CONEXION':
        return <FaCloudUploadAlt className="text-yellow-500 text-3xl" />;
      case 'ARCHIVO_GRANDE':
        return <FaExclamationTriangle className="text-red-500 text-3xl" />;
      default:
        return <FaExclamationTriangle className="text-gray-500 text-3xl" />;
    }
  };

  const obtenerTitulo = () => {
    switch (tipo) {
      case 'CUOTA_EXCEDIDA':
        return 'Almacenamiento en la nube lleno';
      case 'SIN_CONEXION':
        return 'Sin conexión a internet';
      case 'ARCHIVO_GRANDE':
        return 'Archivo demasiado grande';
      default:
        return 'Archivo guardado localmente';
    }
  };

  const obtenerDescripcion = () => {
    switch (tipo) {
      case 'CUOTA_EXCEDIDA':
        return 'El almacenamiento en Supabase ha alcanzado su límite. El archivo se guardó en tu computadora.';
      case 'SIN_CONEXION':
        return 'No hay conexión a internet. El archivo se guardó en tu computadora y se subirá automáticamente cuando vuelva la conexión.';
      case 'ARCHIVO_GRANDE':
        return 'El archivo excede el tamaño máximo permitido. Se guardó en tu computadora.';
      default:
        return mensaje || 'El archivo se guardó en tu computadora en lugar de la nube.';
    }
  };

  const obtenerColorFondo = () => {
    switch (tipo) {
      case 'CUOTA_EXCEDIDA':
        return 'bg-orange-50 border-orange-200';
      case 'SIN_CONEXION':
        return 'bg-yellow-50 border-yellow-200';
      case 'ARCHIVO_GRANDE':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const intentarSincronizar = async () => {
    setSincronizando(true);
    setResultado(null);

    try {
      const response = await window.electronAPI?.storage?.sincronizar();

      if (response?.success) {
        setResultado({
          exito: true,
          mensaje: `✅ ${response.sincronizados} archivos sincronizados exitosamente`
        });

        // Cerrar automáticamente después de 3 segundos
        setTimeout(() => {
          onCerrar();
        }, 3000);
      } else {
        setResultado({
          exito: false,
          mensaje: `❌ Error al sincronizar: ${response?.error || 'Error desconocido'}`
        });
      }
    } catch (error) {
      setResultado({
        exito: false,
        mensaje: `❌ Error: ${error.message}`
      });
    } finally {
      setSincronizando(false);
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-in-right">
      <div className={`rounded-lg border-2 shadow-lg ${obtenerColorFondo()}`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {obtenerIcono()}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {obtenerTitulo()}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {obtenerDescripcion()}
                </p>

                {nombreArchivo && (
                  <p className="mt-2 text-xs text-gray-500">
                    <strong>Archivo:</strong> {nombreArchivo}
                  </p>
                )}

                {enCola && (
                  <div className="mt-2 flex items-center space-x-2 text-xs text-blue-600">
                    <FaSync className="text-xs" />
                    <span>
                      Se intentará subir automáticamente cuando sea posible
                    </span>
                  </div>
                )}

                {archivosEnCola > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {archivosEnCola} archivo{archivosEnCola > 1 ? 's' : ''} pendiente{archivosEnCola > 1 ? 's' : ''} de sincronización
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onCerrar}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          {/* Botones de acción */}
          {enCola && (
            <div className="mt-4 flex items-center space-x-2">
              <button
                onClick={intentarSincronizar}
                disabled={sincronizando}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaSync className={sincronizando ? 'animate-spin' : ''} />
                <span>{sincronizando ? 'Sincronizando...' : 'Intentar ahora'}</span>
              </button>
            </div>
          )}

          {/* Resultado de sincronización */}
          {resultado && (
            <div className={`mt-3 p-2 rounded text-sm ${
              resultado.exito
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {resultado.mensaje}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificacionStorage;

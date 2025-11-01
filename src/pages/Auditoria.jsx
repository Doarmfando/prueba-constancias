import React, { useState, useEffect } from 'react';
import { FaHistory, FaSearch, FaFilter, FaDownload, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { mostrarError, mostrarExito } from '../utils/alertas';
import { useAuth } from '../context/AuthContext';

function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [filtroAccion, setFiltroAccion] = useState('todos');
  const [usuarios, setUsuarios] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const { usuario } = useAuth();
  const logsPerPage = 50;

  useEffect(() => {
    if (usuario) {
      cargarLogs();
      cargarUsuarios();
    }
  }, [pagina, usuario]);

  // Efecto para recargar cuando cambien los filtros
  useEffect(() => {
    if (usuario && pagina === 1) {
      cargarLogs();
    }
  }, [busqueda, filtroUsuario, filtroAccion]);

  const cargarLogs = async () => {
    try {
      setCargando(true);

      const response = await window.electronAPI?.auditoria.obtenerHistorial({
        usuario: usuario,
        limite: logsPerPage,
        offset: (pagina - 1) * logsPerPage,
        filtros: {
          busqueda,
          usuario: filtroUsuario !== 'todos' ? filtroUsuario : null,
          accion: filtroAccion !== 'todos' ? filtroAccion : null
        }
      });

      if (response?.success) {
        setLogs(response.logs || []);
        setTotalLogs(response.total || 0);
      } else {
        setLogs([]);
        setTotalLogs(0);
        if (response?.error) {
          console.error('Error del servidor:', response.error);
        }
      }
    } catch (error) {
      setLogs([]);
      setTotalLogs(0);
      console.error('Error cargando logs de auditoría:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await window.electronAPI?.auth.listarUsuarios();

      if (response?.success) {
        setUsuarios(response.usuarios || []);
      } else {
        setUsuarios([]);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsuarios([]);
    }
  };


  const exportarLogs = async () => {
    try {
      mostrarExito('Funcionalidad de exportación en desarrollo');
    } catch (error) {
      mostrarError('Error al exportar logs', error.message);
    }
  };

  const traducirAccion = (accion) => {
    const traducciones = {
      'crear': 'Creación',
      'editar': 'Edición',
      'eliminar': 'Eliminación',
      'publicar': 'Publicación',
      'acceso': 'Acceso al Sistema'
    };
    return traducciones[accion] || accion;
  };

  const traducirTabla = (tabla) => {
    const traducciones = {
      'proyectos_registros': 'Proyectos',
      'usuarios': 'Usuarios',
      'sistema': 'Sistema',
      'auditoria': 'Auditoría',
      'personas': 'Personas',
      'expedientes': 'Expedientes',
      'registros': 'Registros'
    };
    return traducciones[tabla] || tabla;
  };

  const getIconoAccion = (accion) => {
    switch (accion) {
      case 'crear':
        return <span className="text-green-600">➕</span>;
      case 'editar':
        return <span className="text-blue-600">✏️</span>;
      case 'eliminar':
        return <span className="text-red-600">🗑️</span>;
      case 'publicar':
        return <span className="text-purple-600">📢</span>;
      case 'acceso':
        return <span className="text-gray-600">🔑</span>;
      default:
        return <span className="text-gray-600">📝</span>;
    }
  };

  const getColorAccion = (accion) => {
    switch (accion) {
      case 'crear':
        return 'bg-green-100 text-green-800';
      case 'editar':
        return 'bg-blue-100 text-blue-800';
      case 'eliminar':
        return 'bg-red-100 text-red-800';
      case 'publicar':
        return 'bg-purple-100 text-purple-800';
      case 'acceso':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const logsFiltrados = logs.filter(log => {
    const coincideBusqueda = !busqueda ||
      log.nombre_usuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.accion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      log.tabla_afectada?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideUsuario = filtroUsuario === 'todos' || log.nombre_usuario === filtroUsuario;
    const coincideAccion = filtroAccion === 'todos' || log.accion === filtroAccion;

    return coincideBusqueda && coincideUsuario && coincideAccion;
  });

  const totalPaginas = Math.ceil(totalLogs / logsPerPage);

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-600 mt-1">
            Registro completo de todas las acciones realizadas en el sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={cargarLogs}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar logs"
          >
            <MdRefresh className="text-lg" />
          </button>
          <button
            onClick={exportarLogs}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FaDownload className="text-sm" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{totalLogs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaHistory className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(logs.map(log => log.nombre_usuario)).size}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaUser className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hoy</p>
              <p className="text-2xl font-bold text-purple-600">
                {logs.filter(log => {
                  const hoy = new Date().toDateString();
                  const fechaLog = new Date(log.fecha).toDateString();
                  return hoy === fechaLog;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaCalendarAlt className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Esta Página</p>
              <p className="text-2xl font-bold text-orange-600">{logsFiltrados.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FaFilter className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos los usuarios</option>
            {usuarios.map(usuario => (
              <option key={usuario.id} value={usuario.nombre_usuario}>
                {usuario.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todas las acciones</option>
            <option value="crear">➕ Creación</option>
            <option value="editar">✏️ Edición</option>
            <option value="eliminar">🗑️ Eliminación</option>
            <option value="publicar">📢 Publicación</option>
            <option value="acceso">🔑 Acceso al Sistema</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Página {pagina} de {totalPaginas}
          </div>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📅 Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  👤 Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ⚡ Acción Realizada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📋 Módulo Afectado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📂 Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  📝 Detalles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logsFiltrados.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {new Date(log.fecha).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.fecha).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-gray-400 text-xs" />
                      <span>{log.nombre_usuario || 'Sistema'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getIconoAccion(log.accion)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getColorAccion(log.accion)}`}>
                        {traducirAccion(log.accion)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="bg-blue-50 px-3 py-1 rounded-full text-sm font-medium text-blue-700">
                      {traducirTabla(log.tabla_afectada)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.nombre_proyecto || '---'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={log.detalles}>
                      {log.detalles ? (
                        typeof log.detalles === 'string' ? log.detalles : JSON.stringify(log.detalles)
                      ) : '---'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {(pagina - 1) * logsPerPage + 1} a {Math.min(pagina * logsPerPage, totalLogs)} de {totalLogs} registros
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="px-3 py-2 text-sm text-gray-600">
              {pagina} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaHistory className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información sobre la auditoría</p>
            <ul className="space-y-1">
              <li>• Se registran todas las acciones de los usuarios en el sistema</li>
              <li>• Los logs incluyen fecha, usuario, acción realizada y detalles</li>
              <li>• Solo los administradores pueden acceder a esta información</li>
              <li>• Los registros se mantienen por tiempo indefinido para trazabilidad</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auditoria;
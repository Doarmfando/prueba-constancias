import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaEdit, FaTrash, FaGlobe, FaLock, FaPlus,
  FaDownload, FaChartBar, FaCog, FaUsers, FaFileAlt, FaSearch,
  FaCalendarAlt, FaUser, FaIdCard, FaFilter, FaPrint
} from 'react-icons/fa';
import { MdPublic, MdPrivateConnectivity, MdRestore, MdDeleteForever } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError } from '../utils/alertas';

function ProyectoDetalle() {
  const { id } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('registros');
  const [estadisticas, setEstadisticas] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [registros, setRegistros] = useState([]);
  const [registrosEliminados, setRegistrosEliminados] = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);
  const [mostrarFormularioRegistro, setMostrarFormularioRegistro] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [mostrarModalExportarPDF, setMostrarModalExportarPDF] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [tituloPDF, setTituloPDF] = useState('');
  const [incluirEliminadosEnPDF, setIncluirEliminadosEnPDF] = useState(false);

  // Obtener usuario actual del localStorage
  const getUsuarioActual = () => {
    try {
      const sesion = localStorage.getItem('sesion_usuario');
      if (!sesion) {
        // Si no hay sesión, redirigir al login
        navigate('/login');
        return null;
      }
      return JSON.parse(sesion);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      // Si hay error leyendo la sesión, limpiar y redirigir al login
      localStorage.removeItem('sesion_usuario');
      navigate('/login');
      return null;
    }
  };

  const navigate = useNavigate();
  const usuario = getUsuarioActual();

  // Si no hay usuario, mostrar loading (se redirigirá al login)
  if (!usuario) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  useEffect(() => {
    cargarProyecto();
  }, [id]);

  // Recalcular estadísticas cuando cambien los registros
  useEffect(() => {
    cargarEstadisticas();
  }, [registros, registrosEliminados]);

  const cargarProyecto = async () => {
    try {
      setCargando(true);

      const response = await window.electronAPI?.proyectos.obtenerDetalle(id, usuario);

      if (response?.success && response.proyecto) {
        setProyecto(response.proyecto);
        cargarRegistros(response.proyecto);
      } else {
        console.error('Error cargando proyecto:', response?.error);
        setProyecto(null);
      }
      setCargando(false);
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo cargar el proyecto');
      navigate('/mis-proyectos');
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      // Calcular estadísticas desde los registros reales
      const activos = registros.length;
      const papeleria = registrosEliminados.length;
      const total = activos + papeleria;

      // Encontrar la última actualización
      let ultimaActualizacion = null;
      if (registros.length > 0) {
        const fechas = registros.map(r => new Date(r.fecha_registro || r.fecha_creacion || Date.now()));
        ultimaActualizacion = new Date(Math.max(...fechas)).toISOString();
      }

      setEstadisticas({
        activos,
        papeleria,
        total,
        ultima_actualizacion: ultimaActualizacion
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas({
        activos: 0,
        papeleria: 0,
        total: 0,
        ultima_actualizacion: null
      });
    }
  };

  const cargarRegistros = async (proyectoData = null) => {
    try {
      setCargandoRegistros(true);

      // Usar el proyecto pasado como parámetro o el del estado
      const proyectoActual = proyectoData || proyecto;

      // Verificar que el proyecto esté cargado
      if (!proyectoActual?.id) {
        console.warn('Proyecto no disponible, saltando carga de registros');
        setCargandoRegistros(false);
        return;
      }

      // Cargar registros reales desde la base de datos
      const response = await window.electronAPI?.registros.obtenerPorProyecto(proyectoActual.id);

      if (response?.success) {
        setRegistros(response.registros || []);
        setRegistrosEliminados(response.registrosEliminados || []);
      } else {
        console.error('Error cargando registros:', response?.error);
        setRegistros([]);
        setRegistrosEliminados([]);
      }
      setCargandoRegistros(false);
    } catch (error) {
      console.error('Error cargando registros:', error);
      setCargandoRegistros(false);
    }
  };

  const eliminarProyecto = async () => {
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Eliminar proyecto?',
      texto: `Se eliminará el proyecto \"${proyecto.nombre}\" y todos sus registros.`,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const response = await window.electronAPI?.proyectos.eliminar(proyecto.id, usuario);

        if (response?.success) {
          mostrarExito('Proyecto eliminado correctamente');
          navigate('/mis-proyectos');
        } else {
          mostrarError('Error al eliminar proyecto', response?.error || 'Error de conexión');
        }
      } catch (error) {
        mostrarError('Error al eliminar proyecto', 'Error de conexión');
      }
    }
  };

  const cambiarVisibilidad = async () => {
    const accion = proyecto.es_publico ? 'hacer privado' : 'hacer público';
    const confirmado = await mostrarConfirmacion({
      titulo: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)}?`,
      texto: `Se ${accion} el proyecto \"${proyecto.nombre}\".`,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const response = proyecto.es_publico
          ? await window.electronAPI?.proyectos.hacerPrivado(proyecto.id, usuario)
          : await window.electronAPI?.proyectos.hacerPublico(proyecto.id, usuario);

        if (response?.success) {
          const proyectoActualizado = {
            ...proyecto,
            es_publico: !proyecto.es_publico,
            fecha_publicacion: !proyecto.es_publico ? new Date().toISOString() : null
          };
          setProyecto(proyectoActualizado);
          mostrarExito(`Proyecto ${accion === 'hacer público' ? 'publicado' : 'hecho privado'} correctamente`);
        } else {
          mostrarError(`Error al ${accion} proyecto`, response?.error || 'Error de conexión');
        }
      } catch (error) {
        mostrarError(`Error al ${accion} proyecto`, 'Error de conexión');
      }
    }
  };

  const abrirModalExportarPDF = () => {
    setTituloPDF(proyecto.nombre || '');
    setIncluirEliminadosEnPDF(false);
    setMostrarModalExportarPDF(true);
  };

  const exportarProyectoPDF = async () => {
    try {
      setExportandoPDF(true);

      const response = await window.electronAPI?.proyectos.exportarPDF(
        proyecto.id,
        tituloPDF,
        incluirEliminadosEnPDF,
        usuario
      );

      if (response?.success) {
        mostrarExito('PDF exportado correctamente', response.filePath ? `Guardado en: ${response.filePath}` : '');
        setMostrarModalExportarPDF(false);
      } else {
        if (response?.message && response.message.includes('cancelada')) {
          // No mostrar error si el usuario canceló
          setMostrarModalExportarPDF(false);
        } else {
          mostrarError('Error al exportar PDF', response?.error || 'Error de conexión');
        }
      }
    } catch (error) {
      mostrarError('Error al exportar PDF', 'Error de conexión');
      console.error('Error exportando PDF:', error);
    } finally {
      setExportandoPDF(false);
    }
  };

  const exportarDatos = async () => {
    abrirModalExportarPDF();
  };

  const puedeEditar = () => {
    return usuario.rol === 'administrador' || proyecto?.usuario_creador_id === usuario.id;
  };

  const puedeEliminar = () => {
    return puedeEditar();
  };

  const registrosFiltrados = registros.filter(registro =>
    (registro.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.apellidos || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.dni || '').includes(busqueda) ||
    (registro.expediente || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const eliminarRegistro = async (registro) => {
    const nombreCompleto = registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || 'este registro';
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Eliminar registro?',
      texto: `Se eliminará el registro de ${nombreCompleto}`,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        // Eliminación de registros temporal deshabilitada
        const response = { success: true };

        if (response?.success) {
          setRegistros(prev => prev.filter(r => r.id !== registro.id));
          setRegistrosEliminados(prev => [...prev, { ...registro, fecha_eliminacion: new Date().toISOString(), eliminado_por: usuario.nombre, motivo: 'Eliminado por usuario' }]);
          mostrarExito('Registro eliminado correctamente');
        } else {
          mostrarError('Error al eliminar registro', response?.error || 'Error de conexión');
        }
      } catch (error) {
        mostrarError('Error al eliminar registro', 'Error de conexión');
      }
    }
  };

  const restaurarRegistro = async (registro) => {
    const nombreCompleto = registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || 'este registro';
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Restaurar registro?',
      texto: `Se restaurará el registro de ${nombreCompleto}`,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        // Restauración de registros temporal deshabilitada
        const response = { success: true };

        if (response?.success) {
          setRegistrosEliminados(prev => prev.filter(r => r.id !== registro.id));
          const { fecha_eliminacion, eliminado_por, motivo, ...registroRestaurado } = registro;
          setRegistros(prev => [...prev, { ...registroRestaurado, estado: 'Restaurado' }]);
          mostrarExito('Registro restaurado correctamente');
        } else {
          mostrarError('Error al restaurar registro', response?.error || 'Error de conexión');
        }
      } catch (error) {
        mostrarError('Error al restaurar registro', 'Error de conexión');
      }
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Proyecto no encontrado</h2>
        <p className="text-gray-600 mt-2">El proyecto que buscas no existe o no tienes permisos para verlo.</p>
        <button
          onClick={() => navigate('/mis-proyectos')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver a Mis Proyectos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate('/mis-proyectos')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <FaArrowLeft />
          </button>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{proyecto.nombre}</h1>
              <div className="flex items-center space-x-2">
                {proyecto.es_publico ? (
                  <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <MdPublic className="text-sm" />
                    <span>Público</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    <MdPrivateConnectivity className="text-sm" />
                    <span>Privado</span>
                  </div>
                )}
              </div>
            </div>

            {proyecto.descripcion && (
              <p className="text-gray-600 mb-2">{proyecto.descripcion}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Creado por: {proyecto.nombre_creador}</span>
              <span>•</span>
              <span>{new Date(proyecto.fecha_creacion).toLocaleDateString()}</span>
              {proyecto.fecha_publicacion && (
                <>
                  <span>•</span>
                  <span>Publicado: {new Date(proyecto.fecha_publicacion).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botón exportar */}
          <button
            onClick={exportarDatos}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Exportar a Excel"
          >
            <FaDownload />
          </button>

          {/* Botones de gestión (solo para propietario/admin) */}
          {puedeEditar() && (
            <>
              <button
                onClick={() => navigate(`/proyecto/${proyecto.id}/editar`)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar proyecto"
              >
                <FaEdit />
              </button>

              <button
                onClick={cambiarVisibilidad}
                className={`p-2 rounded-lg transition-colors ${
                  proyecto.es_publico
                    ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`}
                title={proyecto.es_publico ? 'Hacer privado' : 'Hacer público'}
              >
                {proyecto.es_publico ? <FaLock /> : <FaGlobe />}
              </button>

              {puedeEliminar() && (
                <button
                  onClick={eliminarProyecto}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar proyecto"
                >
                  <FaTrash />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registros Activos</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.activos || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Papelería</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.papeleria || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Última Actualización</p>
                <p className="text-sm font-medium text-gray-900">
                  {estadisticas.ultima_actualizacion
                    ? new Date(estadisticas.ultima_actualizacion).toLocaleDateString()
                    : 'Sin actividad'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setTabActiva('registros')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                tabActiva === 'registros'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Registros Activos
            </button>

            <button
              onClick={() => setTabActiva('papeleria')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                tabActiva === 'papeleria'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Papelería
            </button>

            <button
              onClick={() => setTabActiva('estadisticas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                tabActiva === 'estadisticas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Estadísticas
            </button>

            {puedeEditar() && (
              <button
                onClick={() => setTabActiva('configuracion')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  tabActiva === 'configuracion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuración
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {tabActiva === 'registros' && (
            <div className="space-y-6">
              {/* Búsqueda */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Registros Activos</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar registros..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                    />
                  </div>
                  {puedeEditar() && (
                    <button
                      onClick={() => {
                        setRegistroEditando(null);
                        setMostrarFormularioRegistro(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <FaPlus className="text-sm" />
                      <span>Nuevo Registro</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de registros */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expediente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {registrosFiltrados.map((registro) => (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FaUser className="text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim()}
                                </div>
                                <div className="text-sm text-gray-500">DNI: {registro.dni || '---'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{registro.expediente || '---'}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {registro.numero || '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              registro.estado === 'Vigente' ? 'bg-green-100 text-green-800' :
                              registro.estado === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' :
                              registro.estado === 'Recibido' ? 'bg-blue-100 text-blue-800' :
                              registro.estado === 'En Caja' ? 'bg-purple-100 text-purple-800' :
                              registro.estado === 'Entregado' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {registro.estado || '---'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {registro.fecha_registro ? new Date(registro.fecha_registro).toLocaleDateString() : '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {puedeEditar() && (
                                <button
                                  onClick={() => {
                                    setRegistroEditando(registro);
                                    setMostrarFormularioRegistro(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Editar registro"
                                >
                                  <FaEdit />
                                </button>
                              )}
                              <button
                                onClick={() => eliminarRegistro(registro)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar registro"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'papeleria' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Registros Eliminados</h3>

              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Expediente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Eliminado por</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Fecha Eliminación</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-red-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {registrosEliminados.map((registro) => (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                  <FaUser className="text-red-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim()}
                                </div>
                                <div className="text-sm text-gray-500">DNI: {registro.dni || '---'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{registro.expediente}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {registro.estado || '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{registro.eliminado_por}</div>
                            {registro.motivo && (
                              <div className="text-xs text-gray-500">Motivo: {registro.motivo}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(registro.fecha_eliminacion).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => restaurarRegistro(registro)}
                              className="text-green-600 hover:text-green-900"
                              title="Restaurar registro"
                            >
                              <MdRestore />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'estadisticas' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Estadísticas del Proyecto</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaFileAlt className="text-blue-600 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-blue-600">Total Registros</p>
                      <p className="text-2xl font-bold text-blue-800">{estadisticas?.total || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaFileAlt className="text-green-600 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-green-600">Registros Activos</p>
                      <p className="text-2xl font-bold text-green-800">{estadisticas?.activos || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaFileAlt className="text-orange-600 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-orange-600">En Papelería</p>
                      <p className="text-2xl font-bold text-orange-800">{estadisticas?.papeleria || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-gray-600 text-2xl mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Última Actualización</p>
                      <p className="text-sm font-medium text-gray-800">
                        {estadisticas?.ultima_actualizacion
                          ? new Date(estadisticas.ultima_actualizacion).toLocaleDateString()
                          : 'Sin actividad'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">
                  Este proyecto contiene información detallada sobre {estadisticas?.total || 0} registros documentales,
                  con {estadisticas?.activos || 0} registros activos y {estadisticas?.papeleria || 0} en proceso de papelería.
                </p>
              </div>
            </div>
          )}

          {tabActiva === 'configuracion' && puedeEditar() && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Configuración del Proyecto</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Información General</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>ID:</strong> {proyecto.id}</p>
                    <p><strong>Creado:</strong> {new Date(proyecto.fecha_creacion).toLocaleDateString()}</p>
                    <p><strong>Estado:</strong> {proyecto.es_publico ? 'Público' : 'Privado'}</p>
                  </div>
                </div>

                <div className="bg-white p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Permisos</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Creador:</strong> {proyecto.nombre_creador}</p>
                    <p><strong>Edición:</strong> {proyecto.permite_edicion ? 'Habilitada' : 'Solo propietario'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Las opciones de configuración avanzada están disponibles
                  para administradores y propietarios del proyecto.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Formulario de Registro */}
      {mostrarFormularioRegistro && (
        <FormularioRegistro
          proyecto={proyecto}
          registro={registroEditando}
          onClose={() => {
            setMostrarFormularioRegistro(false);
            setRegistroEditando(null);
          }}
          onSave={async () => {
            // Recargar los registros desde la base de datos después de guardar
            await cargarRegistros();
            setMostrarFormularioRegistro(false);
            setRegistroEditando(null);
          }}
        />
      )}

      {/* Modal Exportar PDF */}
      {mostrarModalExportarPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaDownload className="text-lg" />
                Exportar a PDF
              </h3>
              <button
                onClick={() => setMostrarModalExportarPDF(false)}
                disabled={exportandoPDF}
                className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
                title="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título del documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tituloPDF}
                  onChange={(e) => setTituloPDF(e.target.value)}
                  placeholder="Ej: Reporte de Registros - Enero 2024"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Este título aparecerá en el encabezado del PDF
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirEliminadosEnPDF}
                    onChange={(e) => setIncluirEliminadosEnPDF(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Incluir registros en papelería ({registrosEliminados.length})
                  </span>
                </label>
                <p className="ml-8 mt-1 text-xs text-gray-500">
                  Se agregará una sección adicional con los registros eliminados
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FaDownload className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Información a incluir</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Datos del proyecto y estadísticas</li>
                      <li>• Tabla con {registros.length} registros activos</li>
                      {incluirEliminadosEnPDF && <li>• Tabla con {registrosEliminados.length} registros eliminados</li>}
                      <li>• Fecha y hora de generación</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setMostrarModalExportarPDF(false)}
                  disabled={exportandoPDF}
                  className="px-6 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={exportarProyectoPDF}
                  disabled={exportandoPDF || !tituloPDF.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                >
                  <FaDownload className="text-sm" />
                  <span>{exportandoPDF ? 'Generando PDF...' : 'Exportar PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente del Formulario de Registro
function FormularioRegistro({ proyecto, registro, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    numero: '',
    expediente_codigo: '',
    fecha_solicitud: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    observacion: '',
    fecha_entrega: '',
    estado_id: 1
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (registro) {
      setFormData({
        nombre: registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || '',
        dni: registro.dni || '',
        numero: registro.numero || '',
        expediente_codigo: registro.expediente || '',
        fecha_solicitud: registro.fecha_solicitud || '',
        observacion: registro.observacion || '',
        fecha_entrega: registro.fecha_entrega || '',
        estado_id: registro.estado_id || 1
      });
    }
  }, [registro]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let newFormData = {
      ...formData,
      [name]: value
    };

    // Lógica para fechas automáticas según el estado
    if (name === 'estado_id') {
      const estadoId = parseInt(value);

      // Si cambia a "En Caja" (2) o "Entregado" (3), poner fecha de entrega automática
      if (estadoId === 2 || estadoId === 3) {
        newFormData.fecha_entrega = new Date().toISOString().split('T')[0];
      } else {
        // Si cambia a otro estado, quitar fecha de entrega
        newFormData.fecha_entrega = '';
      }
    }

    setFormData(newFormData);

    if (errores[name]) {
      setErrores(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre completo es obligatorio';
    }

    if (!formData.dni.trim()) {
      nuevosErrores.dni = 'El DNI es obligatorio';
    } else if (!/^\d{8}$/.test(formData.dni.trim())) {
      nuevosErrores.dni = 'El DNI debe tener 8 dígitos';
    }

    if (!formData.expediente_codigo.trim()) {
      nuevosErrores.expediente_codigo = 'El código de expediente es obligatorio';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);

      // Mapear estado_id a nombre del estado para el RegistroModel
      const estadosMap = {
        1: 'Recibido',
        2: 'En Caja',
        3: 'Entregado',
        4: 'Tesoreria'
      };

      const datosRegistro = {
        proyecto_id: proyecto.id,
        nombre: formData.nombre.trim(), // RegistroModel espera nombre completo
        dni: formData.dni.trim(),
        numero: formData.numero.trim() || null,
        expediente: formData.expediente_codigo.trim(), // RegistroModel espera 'expediente', no 'expediente_codigo'
        estado: estadosMap[parseInt(formData.estado_id)], // RegistroModel espera nombre del estado, no ID
        fecha_registro: formData.fecha_solicitud || new Date().toISOString().split('T')[0],
        fecha_en_caja: (parseInt(formData.estado_id) === 2 || parseInt(formData.estado_id) === 3) ? formData.fecha_entrega : null,
        usuario_creador_id: 1 // Usuario temporal
      };

      let response;
      if (registro) {
        response = await window.electronAPI?.registros.actualizar({
          id: registro.id,
          ...datosRegistro
        });
      } else {
        response = await window.electronAPI?.registros.agregar(datosRegistro);
      }

      if (response?.success) {
        mostrarExito(registro ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
        onSave(response.registro || { ...datosRegistro, id: Date.now() });
      } else {
        mostrarError('Error al guardar registro', response?.error || 'Error desconocido');
      }
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo guardar el registro');
      console.error('Error guardando registro:', error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {registro ? 'Editar Registro' : 'Nuevo Registro'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Personal */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Información Personal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Juan Pérez García"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
                )}
              </div>

              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-2">
                  DNI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  maxLength={8}
                  placeholder="Ej: 12345678"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.dni ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.dni && (
                  <p className="mt-1 text-sm text-red-600">{errores.dni}</p>
                )}
              </div>

              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-2">
                  Número (opcional)
                </label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  placeholder="Ej: 001-2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Información del Expediente */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Información del Expediente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expediente_codigo" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Expediente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="expediente_codigo"
                  name="expediente_codigo"
                  value={formData.expediente_codigo}
                  onChange={handleInputChange}
                  placeholder="Ej: EXP-2024-001"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.expediente_codigo ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.expediente_codigo && (
                  <p className="mt-1 text-sm text-red-600">{errores.expediente_codigo}</p>
                )}
              </div>

              <div>
                <label htmlFor="estado_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  id="estado_id"
                  name="estado_id"
                  value={formData.estado_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Recibido</option>
                  <option value={2}>En Caja</option>
                  <option value={3}>Entregado</option>
                  <option value={4}>Tesorería</option>
                </select>
              </div>

              <div>
                <label htmlFor="fecha_solicitud" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Solicitud
                </label>
                <input
                  type="date"
                  id="fecha_solicitud"
                  name="fecha_solicitud"
                  value={formData.fecha_solicitud}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="fecha_entrega" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Entrega {(parseInt(formData.estado_id) === 2 || parseInt(formData.estado_id) === 3) ? '(Automática)' : ''}
                </label>
                <input
                  type="date"
                  id="fecha_entrega"
                  name="fecha_entrega"
                  value={formData.fecha_entrega}
                  onChange={handleInputChange}
                  disabled={parseInt(formData.estado_id) === 2 || parseInt(formData.estado_id) === 3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    (parseInt(formData.estado_id) === 2 || parseInt(formData.estado_id) === 3) ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                {(parseInt(formData.estado_id) === 2 || parseInt(formData.estado_id) === 3) && (
                  <p className="mt-1 text-sm text-gray-500">
                    La fecha se establece automáticamente cuando el estado es "En Caja" o "Entregado"
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="observacion" className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  id="observacion"
                  name="observacion"
                  value={formData.observacion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {guardando ? 'Guardando...' : (registro ? 'Actualizar' : 'Crear Registro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProyectoDetalle;
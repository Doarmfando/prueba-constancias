import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaGlobe, FaLock, FaUsers, FaChartBar } from 'react-icons/fa';
import { MdPublic, MdPrivateConnectivity, MdVisibility } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError } from '../utils/alertas';
import { useRealtimeSync } from '../hooks/useRealtimeData';
import { TABLA_PROYECTOS } from '../services/supabaseRealtime';

function MisProyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'privados', 'publicos'
  const [busqueda, setBusqueda] = useState('');

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

  // Función para verificar si el usuario puede editar un proyecto
  const puedeEditar = (proyecto) => {
    return usuario.rol === 'administrador' || proyecto.usuario_creador_id === usuario.id;
  };

  // Realtime para proyectos (alta/baja/cambios) y registros (conteos)
  useRealtimeSync(TABLA_PROYECTOS, () => cargarProyectos(), {
    habilitado: true,
    debounceMs: 500
  });

  useRealtimeSync('registros', () => cargarProyectos(), {
    habilitado: true,
    debounceMs: 500
  });

  useEffect(() => {
    cargarProyectos();
  }, []);

  const cargarProyectos = async () => {
    try {
      setCargando(true);

      // Cargar proyectos desde la base de datos
      const response = await window.electronAPI?.proyectos.obtenerMisProyectos(usuario.id, usuario);

      if (response && response.success) {
        setProyectos(response.proyectos || []);
      } else {
        setProyectos([]);
        if (response && response.error) {
          mostrarError('Error al cargar proyectos', response.error);
        }
      }
      setCargando(false);
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudieron cargar los proyectos');
      console.error('Error cargando proyectos:', error);
      setCargando(false);
    }
  };

  const eliminarProyecto = async (proyecto) => {
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Eliminar proyecto?',
      texto: `Se eliminará el proyecto \"${proyecto.nombre}\" y todos sus registros.`,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const response = await window.electronAPI?.proyectos.eliminar(proyecto.id, usuario);

        if (response.success) {
          mostrarExito('Proyecto eliminado correctamente');
          cargarProyectos();
        } else {
          mostrarError('Error al eliminar', response.error);
        }
      } catch (error) {
        mostrarError('Error de conexión', 'No se pudo eliminar el proyecto');
      }
    }
  };

  const cambiarVisibilidad = async (proyecto) => {
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

        if (response.success) {
          mostrarExito(`Proyecto ${accion === 'hacer público' ? 'publicado' : 'hecho privado'} correctamente`);
          cargarProyectos();
        } else {
          mostrarError(`Error al ${accion}`, response.error);
        }
      } catch (error) {
        mostrarError('Error de conexión', `No se pudo ${accion} el proyecto`);
      }
    }
  };

  const proyectosFiltrados = proyectos.filter(proyecto => {
    const coincideBusqueda = proyecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            proyecto.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

    if (!coincideBusqueda) return false;

    switch (filtro) {
      case 'privados':
        return proyecto.es_publico === false;
      case 'publicos':
        return proyecto.es_publico === true;
      default:
        return true;
    }
  });

  const estadisticas = {
    total: proyectos.length,
    privados: proyectos.filter(p => p.es_publico === false).length,
    publicos: proyectos.filter(p => p.es_publico === true).length,
    totalRegistros: proyectos.reduce((sum, p) => sum + (p.total_registros || 0), 0)
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Mis Proyectos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus proyectos de registros y compártelos con el equipo
          </p>
        </div>
        <button
          onClick={() => navigate('/crear-proyecto')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FaPlus className="text-sm" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaChartBar className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Privados</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.privados}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <FaLock className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Públicos</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.publicos}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaGlobe className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.totalRegistros}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaUsers className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({estadisticas.total})
            </button>
            <button
              onClick={() => setFiltro('privados')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'privados'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Privados ({estadisticas.privados})
            </button>
            <button
              onClick={() => setFiltro('publicos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'publicos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Públicos ({estadisticas.publicos})
            </button>
          </div>

          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de proyectos */}
      {proyectosFiltrados.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <div className="text-gray-400 mb-4">
            <FaChartBar className="mx-auto text-4xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {proyectos.length === 0 ? 'No tienes proyectos aún' : 'No se encontraron proyectos'}
          </h3>
          <p className="text-gray-600 mb-4">
            {proyectos.length === 0
              ? 'Crea tu primer proyecto para empezar a organizar tus registros'
              : 'Intenta con diferentes términos de búsqueda o filtros'
            }
          </p>
          {proyectos.length === 0 && (
            <button
              onClick={() => navigate('/crear-proyecto')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primer Proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectosFiltrados.map((proyecto) => (
            <div
              key={proyecto.id}
              className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {proyecto.nombre}
                    </h3>
                    {proyecto.descripcion && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {proyecto.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    {proyecto.es_publico ? (
                      <div className="p-2 bg-green-100 rounded-full" title="Público">
                        <MdPublic className="text-green-600 text-sm" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gray-100 rounded-full" title="Privado">
                        <MdPrivateConnectivity className="text-gray-600 text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{proyecto.total_registros || 0} registros</span>
                  <span>{new Date(proyecto.fecha_creacion).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/proyecto/${proyecto.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <MdVisibility className="text-sm" />
                    <span>Abrir</span>
                  </button>

                  {puedeEditar(proyecto) && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/proyecto/${proyecto.id}/editar`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar proyecto"
                      >
                        <FaEdit className="text-sm" />
                      </button>

                      <button
                        onClick={() => cambiarVisibilidad(proyecto)}
                        className={`p-2 rounded-lg transition-colors ${
                          proyecto.es_publico
                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={proyecto.es_publico ? 'Hacer privado' : 'Hacer público'}
                      >
                        {proyecto.es_publico ? <FaLock className="text-sm" /> : <FaGlobe className="text-sm" />}
                      </button>

                      <button
                        onClick={() => eliminarProyecto(proyecto)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar proyecto"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MisProyectos;

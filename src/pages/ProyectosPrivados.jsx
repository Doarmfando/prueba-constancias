import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaUsers, FaEye, FaEdit, FaCalendarAlt, FaSearch, FaShieldAlt } from 'react-icons/fa';
import { MdPrivateConnectivity } from 'react-icons/md';
import { mostrarError } from '../utils/alertas';
import Paginacion from '../components/Paginacion';
import { useRealtimeSync } from '../hooks/useRealtimeData';
import { TABLA_PROYECTOS } from '../services/supabaseRealtime';

function ProyectosPrivados() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 9; // 3 columnas x 3 filas = 9 tarjetas por pagina

  // Obtener usuario actual del localStorage
  const getUsuarioActual = () => {
    try {
      const sesion = localStorage.getItem('sesion_usuario');
      if (!sesion) {
        navigate('/login');
        return null;
      }
      return JSON.parse(sesion);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      localStorage.removeItem('sesion_usuario');
      navigate('/login');
      return null;
    }
  };

  const navigate = useNavigate();
  const usuario = getUsuarioActual();

  // Verificar que el usuario sea administrador
  if (usuario && usuario.rol !== 'administrador') {
    navigate('/mis-proyectos');
    return null;
  }

  // Si no hay usuario, mostrar loading (se redirigirá al login)
  if (!usuario) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Realtime para proyectos y registros vinculados
  useRealtimeSync(TABLA_PROYECTOS, () => cargarProyectosPrivados({ mostrarLoading: false }), {
    habilitado: true,
    debounceMs: 500
  });

  useRealtimeSync('registros', () => cargarProyectosPrivados({ mostrarLoading: false }), {
    habilitado: true,
    debounceMs: 500
  });

  useEffect(() => {
    cargarProyectosPrivados({ mostrarLoading: true });
  }, []);

  const cargarProyectosPrivados = async ({ mostrarLoading = false } = {}) => {
    try {
      if (mostrarLoading) setCargando(true);

      const response = await window.electronAPI?.proyectos.obtenerPrivadosOtros(usuario);

      if (response?.success) {
        setProyectos(response.proyectos || []);
      } else {
        console.error('Error cargando proyectos privados:', response?.error);
        setProyectos([]);
        if (response?.error) {
          mostrarError('Error', response.error);
        }
      }
      if (mostrarLoading) setCargando(false);
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudieron cargar los proyectos privados');
      console.error('Error cargando proyectos privados:', error);
      if (mostrarLoading) setCargando(false);
    }
  };

  const proyectosFiltrados = proyectos.filter(proyecto =>
    proyecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.nombre_creador?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Paginacion
  const totalPaginas = Math.ceil(proyectosFiltrados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const proyectosPaginados = proyectosFiltrados.slice(indiceInicio, indiceFin);

  // Resetear a pagina 1 cuando cambia la busqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaShieldAlt className="text-orange-600" />
            Proyectos Privados (Admin)
          </h1>
          <p className="text-gray-600 mt-1">
            Visualiza proyectos privados de otros usuarios (acceso de administrador)
          </p>
        </div>
      </div>



      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Proyectos Privados</p>
              <p className="text-2xl font-bold text-gray-900">{proyectos.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FaLock className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">
                {proyectos.reduce((sum, p) => sum + (p.total_registros || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaUsers className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios Diferentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(proyectos.map(p => p.usuario_creador_id)).size}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar proyectos por nombre, descripción o creador..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lista de proyectos */}
      {proyectosFiltrados.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <div className="text-gray-400 mb-4">
            <FaLock className="mx-auto text-4xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {proyectos.length === 0 ? 'No hay proyectos privados de otros usuarios' : 'No se encontraron proyectos'}
          </h3>
          <p className="text-gray-600">
            {proyectos.length === 0
              ? 'Los proyectos privados de otros usuarios aparecerán aquí'
              : 'Intenta con diferentes términos de búsqueda'
            }
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectosPaginados.map((proyecto) => (
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
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {proyecto.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <div className="p-2 bg-orange-100 rounded-full" title="Proyecto privado">
                      <MdPrivateConnectivity className="text-orange-600 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Registros: {proyecto.total_registros || 0}</span>
                    <span>
                      <FaCalendarAlt className="inline mr-1" />
                      {new Date(proyecto.fecha_creacion).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FaUsers className="mr-1" />
                    <span>Creado por: {proyecto.nombre_creador}</span>
                  </div>

                  <div className="flex items-center text-sm text-orange-600">
                    <FaLock className="mr-1" />
                    <span>Privado</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/proyecto/${proyecto.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FaEye className="text-sm" />
                    <span>Ver Proyecto</span>
                  </button>

                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    Acceso Admin
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Paginacion */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambioPagina={setPaginaActual}
            totalItems={proyectosFiltrados.length}
            itemsPorPagina={itemsPorPagina}
            itemsEnPaginaActual={proyectosPaginados.length}
          />
        </div>
        </>
      )}

    </div>
  );
}

export default ProyectosPrivados;

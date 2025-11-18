import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGlobe, FaUsers, FaEye, FaCalendarAlt, FaSearch, FaSync } from 'react-icons/fa';
import { MdPublic } from 'react-icons/md';
import { mostrarError } from '../utils/alertas';
import { useRealtimeSync } from '../hooks/useRealtimeData';
import { toast } from 'react-toastify';

function ProyectosPublicos() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
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

  // Configurar sincronización en tiempo real
  const { conectado, sincronizando, ultimaActualizacion } = useRealtimeSync(
    'proyectos',
    cargarProyectosPublicos,
    {
      habilitado: window.__WEB_BRIDGE__ === true,
      debounceMs: 500,
      onCambio: (evento) => {
        const mensajes = {
          INSERT: '✨ Nuevo proyecto público disponible',
          UPDATE: '🔄 Proyecto actualizado',
          DELETE: '🗑️ Proyecto eliminado'
        };

        if (mensajes[evento.tipo]) {
          toast.info(mensajes[evento.tipo], {
            position: 'bottom-right',
            autoClose: 2000
          });
        }
      }
    }
  );

  useEffect(() => {
    cargarProyectosPublicos();
  }, []);

  const cargarProyectosPublicos = async () => {
    try {
      setCargando(true);

      const response = await window.electronAPI?.proyectos.obtenerProyectosPublicos();

      if (response?.success) {
        setProyectos(response.proyectos || []);
      } else {
        console.error('Error cargando proyectos públicos:', response?.error);
        setProyectos([]);
      }
      setCargando(false);
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudieron cargar los proyectos públicos');
      console.error('Error cargando proyectos públicos:', error);
      setCargando(false);
    }
  };

  const proyectosFiltrados = proyectos.filter(proyecto =>
    proyecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.nombre_creador?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const puedeEditar = (proyecto) => {
    return usuario.rol === 'administrador' ||
           proyecto.usuario_creador_id === usuario.id ||
           proyecto.permite_edicion === 1;
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
          <h1 className="text-2xl font-bold text-gray-900">Proyectos Públicos</h1>
          <p className="text-gray-600 mt-1">
            Explora proyectos compartidos por la comunidad
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Proyectos</p>
              <p className="text-2xl font-bold text-gray-900">{proyectos.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MdPublic className="text-blue-600" />
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
            <FaGlobe className="mx-auto text-4xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {proyectos.length === 0 ? 'No hay proyectos públicos aún' : 'No se encontraron proyectos'}
          </h3>
          <p className="text-gray-600">
            {proyectos.length === 0
              ? 'Los proyectos públicos aparecerán aquí cuando los usuarios los compartan'
              : 'Intenta con diferentes términos de búsqueda'
            }
          </p>
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
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {proyecto.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <div className="p-2 bg-green-100 rounded-full" title="Proyecto público">
                      <MdPublic className="text-green-600 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Registros: {proyecto.total_registros || 0}</span>
                    <span>
                      <FaCalendarAlt className="inline mr-1" />
                      {new Date(proyecto.fecha_publicacion || proyecto.fecha_creacion).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FaUsers className="mr-1" />
                    <span>Creado por: {proyecto.nombre_creador}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/proyecto/${proyecto.id}`, { state: { from: '/proyectos-publicos' } })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FaEye className="text-sm" />
                    <span>Ver Proyecto</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaGlobe className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Acerca de los proyectos públicos</p>
            <ul className="space-y-1">
              <li>• Los proyectos públicos son visibles para todos los usuarios</li>
              <li>• Puedes ver y trabajar en proyectos de otros usuarios según sus permisos</li>
              <li>• Los cambios que hagas se registran con tu nombre de usuario</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProyectosPublicos;

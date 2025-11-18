import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaUserCheck, FaUserTimes, FaSearch, FaKey } from 'react-icons/fa';
import { MdAdminPanelSettings, MdWork, MdSettings } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError } from '../utils/alertas';
import Paginacion from '../components/Paginacion';
import { useRealtimeSync } from '../hooks/useRealtimeData';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'activos', 'inactivos', 'admin'
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Temporalmente sin autenticacion - simular usuario admin
  const usuarioActual = { id: 1, nombre: "Usuario Temporal", rol: "administrador" };

  // Realtime
  useRealtimeSync('usuarios', () => cargarUsuarios({ mostrarLoading: false }), {
    habilitado: true,
    debounceMs: 500
  });

  useEffect(() => {
    cargarUsuarios({ mostrarLoading: true });
  }, []);

  const cargarUsuarios = async ({ mostrarLoading = false } = {}) => {
    try {
      if (mostrarLoading) setCargando(true);

      const response = await window.electronAPI?.auth.listarUsuarios(usuarioActual);

      if (response?.success) {
        setUsuarios(response.usuarios || []);
      } else {
        mostrarError('Error al cargar usuarios', response?.error || 'Error de conexión');
        setUsuarios([]);
      }
      if (mostrarLoading) setCargando(false);
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudieron cargar los usuarios');
      console.error('Error cargando usuarios:', error);
      if (mostrarLoading) setCargando(false);
    }
  };

  const crearUsuario = async (datosUsuario) => {
    try {
      const response = await window.electronAPI?.auth.crearUsuario(datosUsuario, usuarioActual);

      if (response?.success) {
        mostrarExito('Usuario creado correctamente');
        cargarUsuarios();
        setMostrarFormulario(false);
      } else {
        mostrarError('Error al crear usuario', response?.error || 'Error de conexión');
      }
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo crear el usuario');
    }
  };

  const actualizarUsuario = async (datosUsuario) => {
    try {
      const response = await window.electronAPI?.auth.actualizarUsuario(usuarioEditando.id, datosUsuario);

      if (response?.success) {
        mostrarExito('Usuario actualizado correctamente');
        cargarUsuarios();
        setMostrarFormulario(false);
        setUsuarioEditando(null);
      } else {
        mostrarError('Error al actualizar usuario', response?.error || 'Error de conexión');
      }
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo actualizar el usuario');
    }
  };

  const cambiarEstadoUsuario = async (usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    const confirmado = await mostrarConfirmacion({
      titulo: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      texto: `Se ${accion}á el usuario "${usuario.nombre}".`,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const apiMethod = usuario.activo ? 'desactivarUsuario' : 'activarUsuario';
        const response = await window.electronAPI?.auth[apiMethod](usuario.id);

        if (response?.success) {
          mostrarExito(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`);
          cargarUsuarios();
        } else {
          mostrarError(`Error al ${accion} usuario`, response?.error || 'Error de conexión');
        }
      } catch (error) {
        mostrarError('Error de conexión', `No se pudo ${accion} el usuario`);
      }
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const coincideBusqueda = usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            usuario.nombre_usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
                            usuario.email?.toLowerCase().includes(busqueda.toLowerCase());

    if (!coincideBusqueda) return false;

    switch (filtro) {
      case 'activos':
        return usuario.activo === 1;
      case 'inactivos':
        return usuario.activo === 0;
      case 'admin':
        return usuario.rol === 'administrador';
      case 'trabajadores':
        return usuario.rol === 'trabajador';
      default:
        return true;
    }
  });

  const estadisticas = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo === 1).length,
    administradores: usuarios.filter(u => u.rol === 'administrador').length,
    trabajadores: usuarios.filter(u => u.rol === 'trabajador').length
  };

  // Paginacion
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicio, indiceFin);

  // Resetear a pagina 1 cuando cambia el filtro o busqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [filtro, busqueda]);

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FaPlus className="text-sm" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.activos}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaUserCheck className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-purple-600">{estadisticas.administradores}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <MdAdminPanelSettings className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trabajadores</p>
              <p className="text-2xl font-bold text-orange-600">{estadisticas.trabajadores}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <MdWork className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-wrap gap-2">
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
              onClick={() => setFiltro('activos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'activos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Activos ({estadisticas.activos})
            </button>
            <button
              onClick={() => setFiltro('inactivos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'inactivos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactivos ({usuarios.filter(u => u.activo === 0).length})
            </button>
            <button
              onClick={() => setFiltro('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Administradores ({estadisticas.administradores})
            </button>
            <button
              onClick={() => setFiltro('trabajadores')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === 'trabajadores'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Trabajadores ({estadisticas.trabajadores})
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FaUsers className="text-gray-400 text-4xl mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {usuarios.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios'}
                      </h3>
                      <p className="text-gray-600">
                        {usuarios.length === 0
                          ? 'Crea el primer usuario para empezar'
                          : 'Intenta con diferentes terminos de busqueda o filtros'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosPaginados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FaUsers className="text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {usuario.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{usuario.nombre_usuario}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.rol === 'administrador'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {usuario.rol === 'administrador' ? 'Administrador' : 'Trabajador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.ultimo_acceso
                      ? new Date(usuario.ultimo_acceso).toLocaleDateString()
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(usuario.fecha_creacion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setUsuarioEditando(usuario);
                          setMostrarFormulario(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar usuario"
                      >
                        <FaEdit className="text-sm" />
                      </button>
                      {usuario.id !== usuarioActual.id && (
                        <button
                          onClick={() => cambiarEstadoUsuario(usuario)}
                          className={`p-1 rounded transition-colors ${
                            usuario.activo
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {usuario.activo ? <FaUserTimes className="text-sm" /> : <FaUserCheck className="text-sm" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {usuariosFiltrados.length > 0 && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambioPagina={setPaginaActual}
            totalItems={usuariosFiltrados.length}
            itemsPorPagina={itemsPorPagina}
            itemsEnPaginaActual={usuariosPaginados.length}
          />
        )}
      </div>

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <FormularioUsuario
          usuario={usuarioEditando}
          onGuardar={usuarioEditando ? actualizarUsuario : crearUsuario}
          onCancelar={() => {
            setMostrarFormulario(false);
            setUsuarioEditando(null);
          }}
        />
      )}
    </div>
  );
}

// Componente del formulario de usuario
function FormularioUsuario({ usuario, onGuardar, onCancelar }) {
  const [formData, setFormData] = useState({
    nombre: usuario?.nombre || '',
    nombre_usuario: usuario?.nombre_usuario || '',
    email: usuario?.email || '',
    password: '',
    confirmar_password: '',
    rol: usuario?.rol || 'trabajador'
  });

  const [errores, setErrores] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const nuevosErrores = {};

    // Validaciones
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    }

    if (!formData.nombre_usuario.trim()) {
      nuevosErrores.nombre_usuario = 'El nombre de usuario es obligatorio';
    }

    if (!formData.email.trim()) {
      nuevosErrores.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'El email no tiene un formato válido';
    }

    if (!usuario && !formData.password) {
      nuevosErrores.password = 'La contraseña es obligatoria';
    }

    if (formData.password && formData.password !== formData.confirmar_password) {
      nuevosErrores.confirmar_password = 'Las contraseñas no coinciden';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length === 0) {
      const datos = {
        nombre: formData.nombre,
        nombre_usuario: formData.nombre_usuario,
        email: formData.email,
        rol: formData.rol
      };

      if (formData.password) {
        datos.password = formData.password;
      }

      onGuardar(datos);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo
    if (errores[name]) {
      setErrores(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errores.nombre ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.nombre && (
                <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario
              </label>
              <input
                type="text"
                name="nombre_usuario"
                value={formData.nombre_usuario}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errores.nombre_usuario ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.nombre_usuario && (
                <p className="mt-1 text-sm text-red-600">{errores.nombre_usuario}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@empresa.com"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errores.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.email && (
                <p className="mt-1 text-sm text-red-600">{errores.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {usuario ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errores.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.password && (
                <p className="mt-1 text-sm text-red-600">{errores.password}</p>
              )}
            </div>

            {formData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  name="confirmar_password"
                  value={formData.confirmar_password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errores.confirmar_password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.confirmar_password && (
                  <p className="mt-1 text-sm text-red-600">{errores.confirmar_password}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                name="rol"
                value={formData.rol}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="trabajador">Trabajador</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={onCancelar}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {usuario ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Usuarios;

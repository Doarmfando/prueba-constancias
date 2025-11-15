import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaFileAlt, FaEdit, FaTrash, FaFilePdf, FaCalendarAlt, FaUser, FaIdCard, FaFilter } from 'react-icons/fa';
import { MdPersonAdd, MdFilterList, MdVisibility } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError, formatearFecha } from '../utils/alertas';
import FormularioRegistro from '../components/FormularioRegistro';
import Paginacion from '../components/Paginacion';

function Registros() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const registrosPorPagina = 10;

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    try {
      setCargando(true);

      // Usar el IPC correcto para obtener registros
      const response = await window.electronAPI?.registros.obtener();
      console.log('Respuesta de registros:', response);

      if (response && Array.isArray(response)) {
        // Si viene directamente como array
        setRegistros(response);
      } else if (response && response.success && response.data) {
        // Si viene con estructura success/data
        setRegistros(response.data);
      } else if (response && Array.isArray(response.registros)) {
        // Si viene con propiedad registros
        setRegistros(response.registros);
      } else {
        // Si no hay datos o hay error
        setRegistros([]);
        if (response && response.error) {
          mostrarError('Error al cargar registros', response.error);
        }
      }
      setCargando(false);

    } catch (error) {
      mostrarError('Error de conexión', 'No se pudieron cargar los registros');
      console.error('Error cargando registros:', error);
      setRegistros([]);
      setCargando(false);
    }
  };

  const registrosFiltrados = registros.filter(registro => {
    const coincideBusqueda =
      (registro.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (registro.dni || '').includes(busqueda) ||
      (registro.expediente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (registro.numero || '').includes(busqueda);

    if (!coincideBusqueda) return false;

    if (filtroEstado === 'todos') return true;
    return (registro.estado || '').toLowerCase() === filtroEstado.toLowerCase();
  });

  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const registrosPaginados = registrosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina);

  // Resetear a pagina 1 cuando cambia el filtro o busqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, busqueda]);

  const estadisticas = {
    total: registros.length,
    recibidos: registros.filter(r => r.estado === 'Recibido').length,
    enCaja: registros.filter(r => r.estado === 'En Caja').length,
    entregados: registros.filter(r => r.estado === 'Entregado').length,
    tesoreria: registros.filter(r => r.estado === 'Tesoreria').length
  };

  const eliminarRegistro = async (registro) => {
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Mover a papelera?',
      texto: `Se moverá a papelera el registro de ${registro.nombre || 'Sin nombre'} (DNI: ${registro.dni || 'Sin DNI'})`,
      confirmButtonText: 'Sí, mover a papelera',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const response = await window.electronAPI?.registros.moverAPapelera(registro.id, usuario);
        if (response && response.success) {
          setRegistros(prev => prev.filter(r => r.id !== registro.id));
          mostrarExito('Registro movido a papelera correctamente');
        } else {
          mostrarError('Error', response?.error || 'No se pudo mover el registro a papelera');
        }
      } catch (error) {
        console.error('Error moviendo a papelera:', error);
        mostrarError('Error', 'No se pudo mover el registro a papelera');
      }
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Recibido':
        return 'bg-blue-100 text-blue-800';
      case 'En Caja':
        return 'bg-yellow-100 text-yellow-800';
      case 'Entregado':
        return 'bg-green-100 text-green-800';
      case 'Tesoreria':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Registros Legacy</h1>
          <p className="text-gray-600 mt-1">
            Sistema legacy de gestión de registros documentales
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FaPlus className="text-sm" />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFileAlt className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recibidos</p>
              <p className="text-2xl font-bold text-blue-600">{estadisticas.recibidos}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUser className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Caja</p>
              <p className="text-2xl font-bold text-yellow-600">{estadisticas.enCaja}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaCalendarAlt className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entregados</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.entregados}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaIdCard className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({estadisticas.total})
            </button>
            <button
              onClick={() => setFiltroEstado('recibido')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === 'recibido'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Recibidos ({estadisticas.recibidos})
            </button>
            <button
              onClick={() => setFiltroEstado('en caja')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === 'en caja'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En Caja ({estadisticas.enCaja})
            </button>
            <button
              onClick={() => setFiltroEstado('entregado')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === 'entregado'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Entregados ({estadisticas.entregados})
            </button>
            <button
              onClick={() => setFiltroEstado('tesoreria')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === 'tesoreria'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tesorería ({estadisticas.tesoreria})
            </button>
          </div>

          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Buscar registros..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expediente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha en Caja
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <FaFileAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No se encontraron registros
                    </h3>
                    <p className="text-gray-600">
                      {registros.length === 0
                        ? 'No hay registros en el sistema'
                        : 'Intenta con diferentes términos de búsqueda o filtros'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                registrosPaginados.map((registro) => (
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
                            {registro.nombre || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            DNI: {registro.dni || 'Sin DNI'} | Nº: {registro.numero || 'Sin número'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-900">
                        {registro.expediente || 'Sin expediente'}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatearFecha(registro.fecha_registro) || 'Sin fecha'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(registro.estado)}`}>
                        {registro.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {registro.estado === 'Recibido'
                        ? 'No entregado'
                        : registro.estado === 'En Caja'
                        ? formatearFecha(registro.fecha_en_caja)
                        : '---'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setRegistroEditando(registro);
                            setMostrarFormulario(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar registro"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => eliminarRegistro(registro)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar registro"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {registrosFiltrados.length > 0 && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambioPagina={setPaginaActual}
            totalItems={registrosFiltrados.length}
            itemsPorPagina={registrosPorPagina}
            itemsEnPaginaActual={registrosPaginados.length}
          />
        )}
      </div>

      {/* Informacion Legacy */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaFilter className="text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">Vista Legacy</p>
            <p>Esta es una vista del sistema legacy mantenida por compatibilidad. Se recomienda usar el nuevo sistema de proyectos para nuevos registros.</p>
          </div>
        </div>
      </div>

      {/* Formulario de registro */}
      <FormularioRegistro
        mostrar={mostrarFormulario}
        onCerrar={() => {
          setMostrarFormulario(false);
          setRegistroEditando(null);
        }}
        onRegistroCreado={cargarRegistros}
        registroEditar={registroEditando}
      />
    </div>
  );
}

export default Registros;
  // Obtener usuario actual del localStorage
  const getUsuarioActual = () => {
    try {
      const sesion = localStorage.getItem('sesion_usuario');
      return sesion ? JSON.parse(sesion) : null;
    } catch (e) { return null; }
  };
  const usuario = getUsuarioActual();

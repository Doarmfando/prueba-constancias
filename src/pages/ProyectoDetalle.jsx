import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaArrowLeft, FaEdit, FaTrash, FaGlobe, FaLock, FaPlus,
  FaDownload, FaChartBar, FaCog, FaUsers, FaFileAlt, FaSearch,
  FaCalendarAlt, FaUser, FaIdCard, FaFilter, FaPrint, FaCheckCircle
} from 'react-icons/fa';
import { MdPublic, MdPrivateConnectivity, MdRestore, MdDeleteForever } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError, formatearFecha } from '../utils/alertas';
import { Bar, Doughnut } from 'react-chartjs-2';
import Paginacion from '../components/Paginacion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function ProyectoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [incluirFechaEnPDF, setIncluirFechaEnPDF] = useState(false);
  const [fechaPDF, setFechaPDF] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [paginaEliminados, setPaginaEliminados] = useState(1);
  const itemsPorPagina = 10;
  const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
  const isWebBridge = typeof window !== 'undefined' && window.__WEB_BRIDGE__;

  const generarNombreArchivoPDF = () => {
    const base = tituloPDF || proyecto?.nombre || 'proyecto';
    return `${base.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  };

  // Obtener usuario actual del localStorage
  const getUsuarioActual = () => {
    try {
      const sesion = localStorage.getItem('sesion_usuario');
      if (!sesion) {
        // Si no hay sesiÃ³n, redirigir al login
        navigate('/login');
        return null;
      }
      return JSON.parse(sesion);
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      // Si hay error leyendo la sesiÃ³n, limpiar y redirigir al login
      localStorage.removeItem('sesion_usuario');
      navigate('/login');
      return null;
    }
  };

  const usuario = getUsuarioActual();

  // Si no hay usuario, mostrar loading (se redirigirÃ¡ al login)
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
      mostrarError('Error de conexiÃ³n', 'No se pudo cargar el proyecto');
      navigate('/mis-proyectos');
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      // Calcular estadÃ­sticas por estado desde los registros reales
      const recibidos = registros.filter(r => r.estado === 'Recibido').length;
      const enCaja = registros.filter(r => r.estado === 'En Caja').length;
      const entregados = registros.filter(r => r.estado === 'Entregado').length;
      const tesoreria = registros.filter(r => r.estado === 'Tesoreria').length;
      const activos = registros.length;
      const papeleria = registrosEliminados.length;
      const total = activos + papeleria;

      setEstadisticas({
        recibidos,
        enCaja,
        entregados,
        tesoreria,
        total,
        activos,
        papeleria,
        pendientes: recibidos // Pendientes = los que estÃ¡n en estado "Recibido"
      });
    } catch (error) {
      console.error('Error cargando estadÃ­sticas:', error);
      setEstadisticas({
        recibidos: 0,
        enCaja: 0,
        entregados: 0,
        tesoreria: 0,
        total: 0,
        activos: 0,
        papeleria: 0,
        pendientes: 0
      });
    }
  };

  const cargarRegistros = async (proyectoData = null) => {
    try {
      setCargandoRegistros(true);

      // Usar el proyecto pasado como parÃ¡metro o el del estado
      const proyectoActual = proyectoData || proyecto;

      // Verificar que el proyecto estÃ© cargado
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
      titulo: 'Â¿Eliminar proyecto?',
      texto: `Se eliminarÃ¡ el proyecto \"${proyecto.nombre}\" y todos sus registros.`,
      confirmButtonText: 'SÃ­, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        const response = await window.electronAPI?.proyectos.eliminar(proyecto.id, usuario);

        if (response?.success) {
          mostrarExito('Proyecto eliminado correctamente');
          navigate('/mis-proyectos');
        } else {
          mostrarError('Error al eliminar proyecto', response?.error || 'Error de conexiÃ³n');
        }
      } catch (error) {
        mostrarError('Error al eliminar proyecto', 'Error de conexiÃ³n');
      }
    }
  };

  const cambiarVisibilidad = async () => {
    const accion = proyecto.es_publico ? 'hacer privado' : 'hacer pÃºblico';
    const confirmado = await mostrarConfirmacion({
      titulo: `Â¿${accion.charAt(0).toUpperCase() + accion.slice(1)}?`,
      texto: `Se ${accion} el proyecto \"${proyecto.nombre}\".`,
      confirmButtonText: `SÃ­, ${accion}`,
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
          mostrarExito(`Proyecto ${accion === 'hacer pÃºblico' ? 'publicado' : 'hecho privado'} correctamente`);
        } else {
          mostrarError(`Error al ${accion} proyecto`, response?.error || 'Error de conexiÃ³n');
        }
      } catch (error) {
        mostrarError(`Error al ${accion} proyecto`, 'Error de conexiÃ³n');
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

      if (isWebBridge) {
        const res = await fetch(`${API_BASE_URL}/proyectos/${proyecto.id}/exportar-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: tituloPDF,
            incluirEliminados: incluirEliminadosEnPDF,
            fechaExportacion: incluirFechaEnPDF && fechaPDF ? fechaPDF : null,
            usuario
          })
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody?.error || 'No se pudo generar el PDF');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generarNombreArchivoPDF();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        mostrarExito('PDF exportado correctamente', 'La descarga fue iniciada');
        setMostrarModalExportarPDF(false);
      } else {
        const response = await window.electronAPI?.proyectos.exportarPDF(
          proyecto.id,
          tituloPDF,
          incluirEliminadosEnPDF,
          incluirFechaEnPDF && fechaPDF ? fechaPDF : null,
          usuario
        );

        if (response?.success) {
          mostrarExito('PDF exportado correctamente', response.filePath ? `Guardado en: ${response.filePath}` : '');
          setMostrarModalExportarPDF(false);
        } else {
          if (response?.message && response.message.includes('cancelada')) {
            setMostrarModalExportarPDF(false);
          } else {
            mostrarError('Error al exportar PDF', response?.error || 'Error de conexi�n');
          }
        }
      }
    } catch (error) {
      mostrarError('Error al exportar PDF', error.message || 'Error de conexi�n');
      console.error('Error exportando PDF:', error);
    } finally {
      setExportandoPDF(false);
    }
  }; 

  const exportarDatos = async () => {
    abrirModalExportarPDF();
  };

  // Permisos para editar/eliminar REGISTROS (dentro del proyecto)
  const puedeEditarRegistros = () => {
    if (!proyecto) return false;
    return (
      usuario.rol === 'administrador' ||
      proyecto.usuario_creador_id === usuario.id ||
      proyecto.es_publico === true  // Proyectos públicos: todos pueden editar registros
    );
  };

  // Permisos para editar/eliminar el PROYECTO en sí (configuración, visibilidad, etc)
  const puedeEditarProyecto = () => {
    if (!proyecto) return false;
    return (
      usuario.rol === 'administrador' ||
      proyecto.usuario_creador_id === usuario.id  // Solo creador o admin
    );
  };

  const puedeEliminar = () => {
    return puedeEditarRegistros();
  };

  // Mantener puedeEditar() para compatibilidad con código existente (usar puedeEditarRegistros)
  const puedeEditar = () => {
    return puedeEditarRegistros();
  };

  const registrosFiltrados = registros.filter(registro =>
    (registro.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.apellidos || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (registro.dni || '').includes(busqueda) ||
    (registro.expediente || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // Paginacion de registros activos
  const totalPaginasRegistros = Math.ceil(registrosFiltrados.length / itemsPorPagina);
  const indiceInicioRegistros = (paginaActual - 1) * itemsPorPagina;
  const registrosPaginados = registrosFiltrados.slice(indiceInicioRegistros, indiceInicioRegistros + itemsPorPagina);

  // Paginacion de registros eliminados
  const totalPaginasEliminados = Math.ceil(registrosEliminados.length / itemsPorPagina);
  const indiceInicioEliminados = (paginaEliminados - 1) * itemsPorPagina;
  const eliminadosPaginados = registrosEliminados.slice(indiceInicioEliminados, indiceInicioEliminados + itemsPorPagina);

  // Resetear pagina al cambiar busqueda o tab
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, tabActiva]);

  useEffect(() => {
    setPaginaEliminados(1);
  }, [tabActiva]);

  const eliminarRegistro = async (registro) => {
    const nombreCompleto = registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || 'este registro';
    const confirmado = await mostrarConfirmacion({
      titulo: 'Â¿Eliminar registro?',
      texto: `Se eliminarÃ¡ el registro de ${nombreCompleto}`,
      confirmButtonText: 'SÃ­, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        // Mover a papelería usando la API real
        const response = await window.electronAPI?.registros.moverAPapelera(registro.id, usuario);

        if (response?.success) {
          // Recargar los registros desde la base de datos para obtener el estado actualizado
          await cargarRegistros();
          mostrarExito('Registro movido a papelería correctamente');
        } else {
          mostrarError('Error al eliminar registro', response?.error || 'Error de conexiÃ³n');
        }
      } catch (error) {
        mostrarError('Error al eliminar registro', error.message || 'Error de conexiÃ³n');
        console.error('Error eliminando registro:', error);
      }
    }
  };

  const restaurarRegistro = async (registro) => {
    const nombreCompleto = registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || 'este registro';
    const confirmado = await mostrarConfirmacion({
      titulo: 'Â¿Restaurar registro?',
      texto: `Se restaurarÃ¡ el registro de ${nombreCompleto}`,
      confirmButtonText: 'SÃ­, restaurar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        // Restaurar usando la API real
        const response = await window.electronAPI?.registros.restaurar(registro.id, usuario);

        if (response?.success) {
          // Recargar los registros desde la base de datos para obtener el estado actualizado
          await cargarRegistros();
          mostrarExito('Registro restaurado correctamente');
        } else {
          mostrarError('Error al restaurar registro', response?.error || 'Error de conexiÃ³n');
        }
      } catch (error) {
        mostrarError('Error al restaurar registro', error.message || 'Error de conexiÃ³n');
        console.error('Error restaurando registro:', error);
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
            onClick={() => {
              // Detectar de dónde vino el usuario
              const from = location.state?.from || document.referrer;
              if (from && from.includes('/proyectos-publicos')) {
                navigate('/proyectos-publicos');
              } else {
                navigate('/mis-proyectos');
              }
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            title="Volver atrás"
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
              <span>{new Date(proyecto.fecha_creacion).toLocaleDateString()}</span>
              {proyecto.fecha_publicacion && (
                <>
                  <span>Publicado: {new Date(proyecto.fecha_publicacion).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* BotÃ³n exportar */}
          <button
            onClick={exportarDatos}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Exportar a PDF"
          >
            <FaDownload />
          </button>

          {/* Botones de gestiÃ³n del PROYECTO (solo para creador/admin) */}
          {puedeEditarProyecto() && (
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
                title={proyecto.es_publico ? 'Hacer privado' : 'Hacer pÃºblico'}
              >
                {proyecto.es_publico ? <FaLock /> : <FaGlobe />}
              </button>

              <button
                onClick={eliminarProyecto}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar proyecto"
              >
                <FaTrash />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaChartBar className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registros Activos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.activos || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaFileAlt className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Papelería</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.papeleria || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <FaTrash className="text-orange-600" />
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
              {/* BÃºsqueda */}
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
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expediente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha en Caja</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {registrosPaginados.map((registro, index) => (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {indiceInicioRegistros + index + 1}
                          </td>
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
                                <div className="text-sm text-gray-500">
                                  DNI: {registro.dni || '---'} | Nº: {registro.numero || '---'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{registro.expediente || '---'}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatearFecha(registro.fecha_registro)}
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
                            {registro.estado === 'Recibido'
                              ? 'No entregado'
                              : registro.estado === 'En Caja' || registro.estado === 'Entregado'
                              ? formatearFecha(registro.fecha_en_caja)
                              : '---'
                            }
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
                              {puedeEliminar() && (
                                <button
                                  onClick={() => eliminarRegistro(registro)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar registro"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginacion de registros activos */}
                {registrosFiltrados.length > 0 && (
                  <Paginacion
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginasRegistros}
                    onCambioPagina={setPaginaActual}
                    totalItems={registrosFiltrados.length}
                    itemsPorPagina={itemsPorPagina}
                    itemsEnPaginaActual={registrosPaginados.length}
                  />
                )}
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Expediente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Eliminado por</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase">Fecha EliminaciÃ³n</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-red-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {eliminadosPaginados.map((registro, index) => (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {indiceInicioEliminados + index + 1}
                          </td>
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
                            <div className="text-sm text-gray-900">{registro.eliminado_por_nombre || 'Sistema'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {registro.fecha_eliminacion ? new Date(registro.fecha_eliminacion).toLocaleString('es-ES') : '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {puedeEditar() && (
                              <button
                                onClick={() => restaurarRegistro(registro)}
                                className="text-green-600 hover:text-green-900"
                                title="Restaurar registro"
                              >
                                <MdRestore />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginacion de registros eliminados */}
                {registrosEliminados.length > 0 && (
                  <Paginacion
                    paginaActual={paginaEliminados}
                    totalPaginas={totalPaginasEliminados}
                    onCambioPagina={setPaginaEliminados}
                    totalItems={registrosEliminados.length}
                    itemsPorPagina={itemsPorPagina}
                    itemsEnPaginaActual={eliminadosPaginados.length}
                  />
                )}
              </div>
            </div>
          )}

          {tabActiva === 'estadisticas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Resumen General</h3>
                <div className="flex items-center space-x-3">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Fecha de Registro</option>
                    <option>Fecha en Caja</option>
                  </select>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Todo</option>
                    <option>Última semana</option>
                    <option>Último mes</option>
                  </select>
                </div>
              </div>

              {/* Tarjetas de estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-yellow-500 p-6 rounded-lg shadow">
                  <p className="text-white text-sm font-medium mb-1">Recibidos</p>
                  <p className="text-white text-4xl font-bold">{estadisticas?.recibidos || 0}</p>
                </div>

                <div className="bg-blue-500 p-6 rounded-lg shadow">
                  <p className="text-white text-sm font-medium mb-1">En Caja</p>
                  <p className="text-white text-4xl font-bold">{estadisticas?.enCaja || 0}</p>
                </div>

                <div className="bg-green-600 p-6 rounded-lg shadow">
                  <p className="text-white text-sm font-medium mb-1">Entregados</p>
                  <p className="text-white text-4xl font-bold">{estadisticas?.entregados || 0}</p>
                </div>

                <div className="bg-purple-600 p-6 rounded-lg shadow">
                  <p className="text-white text-sm font-medium mb-1">Tesoreria</p>
                  <p className="text-white text-4xl font-bold">{estadisticas?.tesoreria || 0}</p>
                </div>
              </div>

              {/* GrÃ¡ficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* GrÃ¡fico de Dona - DistribuciÃ³n por Estado */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    DistribuciÃ³n por Estado
                  </h4>
                  <div className="h-64 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: ['Recibido', 'En Caja', 'Entregado', 'Tesoreria'],
                        datasets: [{
                          data: [
                            estadisticas?.recibidos || 0,
                            estadisticas?.enCaja || 0,
                            estadisticas?.entregados || 0,
                            estadisticas?.tesoreria || 0
                          ],
                          backgroundColor: [
                            'rgb(234, 179, 8)',
                            'rgb(59, 130, 246)',
                            'rgb(22, 163, 74)',
                            'rgb(147, 51, 234)'
                          ],
                          borderColor: [
                            'rgb(234, 179, 8)',
                            'rgb(59, 130, 246)',
                            'rgb(22, 163, 74)',
                            'rgb(147, 51, 234)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 15,
                              usePointStyle: true,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}\nâ–  Total: ${value}`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* GrÃ¡fico de Barras - Pendientes por llegar a caja */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Pendientes por llegar a caja
                  </h4>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: ['Por llegar a caja'],
                        datasets: [{
                          label: 'Pendientes',
                          data: [estadisticas?.pendientes || 0],
                          backgroundColor: 'rgba(239, 68, 68, 0.8)',
                          borderColor: 'rgb(239, 68, 68)',
                          borderWidth: 2,
                          borderRadius: 6,
                          maxBarThickness: 48,
                          barThickness: 40
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              usePointStyle: true,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return 'Pendientes: ' + context.parsed.y + ' registros';
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 2,
                              font: {
                                size: 11
                              }
                            }
                          },
                          x: {
                            ticks: {
                              font: {
                                size: 11
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
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
                    <p><strong>Edicion:</strong> {proyecto.permite_edicion ? 'Habilitada' : 'Solo propietario'}</p>
                  </div>
                </div>
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
          usuario={usuario}
          onClose={() => {
            setMostrarFormularioRegistro(false);
            setRegistroEditando(null);
          }}
          onSave={async () => {
            // Recargar los registros desde la base de datos despuÃ©s de guardar
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
                  Titulo del documento <span className="text-red-500">*</span>
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

              {/* Opciones de fecha */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirFechaEnPDF}
                    onChange={(e) => {
                      setIncluirFechaEnPDF(e.target.checked);
                      if (e.target.checked) {
                        setFechaPDF(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Incluir fecha
                  </span>
                </label>
                {incluirFechaEnPDF && (
                  <div className="mt-3 ml-8">
                    <input
                      type="date"
                      value={fechaPDF}
                      onChange={(e) => setFechaPDF(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Puedes modificar la fecha si lo deseas
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FaDownload className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Información a incluir</p>
                    <ul className="space-y-1 text-xs">
                      <li>Tabla con {registros.length} registros activos</li>
                      {incluirEliminadosEnPDF && <li> Tabla con {registrosEliminados.length} registros eliminados</li>}
                      {incluirFechaEnPDF && fechaPDF && <li>Fecha personalizada en encabezado</li>}
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
function FormularioRegistro({ proyecto, registro, onClose, onSave, usuario }) {
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    numero: '',
    expediente_codigo: '',
    fecha_registro: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    Observación: '',
    fecha_en_caja: '',
    estado_id: 1,
    persona_id: null,
    expediente_id: null
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState(null);
  const [datosAutocompletados, setDatosAutocompletados] = useState(false);

  useEffect(() => {
    if (registro) {
      // Mapear nombre del estado a ID
      const estadosInversoMap = {
        'Recibido': 1,
        'En Caja': 2,
        'Entregado': 3,
        'Tesoreria': 4
      };

      setFormData({
        nombre: registro.nombre || `${registro.nombres || ''} ${registro.apellidos || ''}`.trim() || '',
        dni: registro.dni || '',
        numero: registro.numero || '',
        expediente_codigo: registro.expediente || '',
        fecha_registro: (registro.fecha_registro && registro.fecha_registro !== '---') ? registro.fecha_registro : '',
        Observación: registro.Observación || '',
        fecha_en_caja: (registro.fecha_en_caja && registro.fecha_en_caja !== '---' && registro.fecha_en_caja !== 'No entregado') ? registro.fecha_en_caja : '',
        estado_id: estadosInversoMap[registro.estado] || 1,
        persona_id: registro.persona_id || null,
        expediente_id: registro.expediente_id || null
      });
    }
  }, [registro]);

  const buscarPersonaPorDni = async (dni) => {
    // Validar que el DNI tenga exactamente 8 dÃ­gitos antes de buscar
    if (!dni || dni.trim().length !== 8) {
      setPersonaEncontrada(null);
      setDatosAutocompletados(false);
      return;
    }

    try {
      setBuscandoDni(true);
      console.log('ðŸ” Buscando persona con DNI:', dni);
      const response = await window.electronAPI?.informacion.buscarPersonaPorDni(dni.trim());
      console.log('ðŸ“¥ Respuesta completa:', JSON.stringify(response, null, 2));

      if (response?.success && response.persona) {
        const persona = response.persona;
        const registros = response.registros || [];

        // Preferir nombre completo si viene; si no, construir desde nombres y apellidos
        const nombreCompleto = (persona.nombre && persona.nombre.trim())
          ? persona.nombre.trim()
          : `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();

        // Obtener nÃºmero del primer registro si existe
        const numeroRegistro = registros.length > 0 && registros[0].numero ? registros[0].numero : '';

        console.log('âœ… Persona encontrada - ID:', persona.id);
        console.log('   - Nombres:', persona.nombres);
        console.log('   - Apellidos:', persona.apellidos);
        console.log('   - Nombre completo:', nombreCompleto);
        console.log('   - DNI:', persona.dni);
        console.log('   - Registros encontrados:', registros.length);
        console.log('   - Numero (del primer registro):', numeroRegistro);

        // Guardar persona con nombre completo y numero para uso posterior
        const personaConNombreCompleto = { ...persona, nombre: nombreCompleto, numero: numeroRegistro };

        setPersonaEncontrada(personaConNombreCompleto);

        // Autocompletar solo si no estamos editando
        if (!registro) {
          const nombreNuevo = nombreCompleto;
          const numeroNuevo = numeroRegistro;

          console.log(' Valores a autocompletar:');
          console.log('   - Nombre nuevo:', nombreNuevo);
          console.log('   - Numero nuevo:', numeroNuevo);

          setFormData(prev => {
            console.log('   - FormData anterior:', JSON.stringify(prev, null, 2));
            const newData = {
              ...prev,
              nombre: nombreNuevo,
              numero: numeroNuevo
            };
            console.log('FormData actualizado:', JSON.stringify(newData, null, 2));
            return newData;
          });

          setDatosAutocompletados(true);
          console.log(' Datos autocompletados establecido en true');
        } else {
          console.log(' No se autocompleta porque estamos editando un registro existente');
        }
      } else {
        console.log('Persona no encontrada - response.success:', response?.success);
        setPersonaEncontrada(null);
        setDatosAutocompletados(false);
      }
    } catch (error) {
      console.error(' Error buscando persona:', error);
      setPersonaEncontrada(null);
    } finally {
      setBuscandoDni(false);
      console.log('Busqueda finalizada');
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Si se modificÃ³ el DNI, buscar persona primero antes de actualizar el estado
    if (name === 'dni') {
      // Actualizar DNI inmediatamente
      setFormData(prev => ({
        ...prev,
        dni: value
      }));

      // Buscar persona y autocompletar
      await buscarPersonaPorDni(value);

      // Limpiar error si existe
      if (errores.dni) {
        setErrores(prev => ({
          ...prev,
          dni: ''
        }));
      }
      return; // Salir para evitar actualizaciÃ³n duplicada
    }

    // Para otros campos, actualizar normalmente
    let newFormData = {
      ...formData,
      [name]: value
    };

    // Lógica automática de fecha_en_caja según el estado
    if (name === 'estado_id') {
      const estadoId = parseInt(value);

      if (estadoId === 2) {
        // Estado "En Caja" - poner fecha actual (editable)
        newFormData.fecha_en_caja = new Date().toISOString().split('T')[0];
      } else if (estadoId === 3 || estadoId === 1 || estadoId === 4) {
        // Estados "Entregado", "Recibido", "Tesoreria" - dejar vacío (---)
        newFormData.fecha_en_caja = '';
      }
    }

    setFormData(newFormData);

    // Si se modificÃ³ nombre o nÃºmero manualmente, desactivar indicador de autocompletado
    if ((name === 'nombre' || name === 'numero') && datosAutocompletados) {
      setDatosAutocompletados(false);
    }

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
      nuevosErrores.dni = 'El DNI debe tener 8 dÃ­gitos';
    }

    if (!formData.expediente_codigo.trim()) {
      nuevosErrores.expediente_codigo = 'El Código de Expediente es obligatorio';
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
        fecha_registro: formData.fecha_registro || new Date().toISOString().split('T')[0],
        fecha_en_caja: formData.fecha_en_caja || null,
        usuario_creador_id: 1, // Usuario temporal
        persona_existente_id: personaEncontrada?.id || null, // Enviar ID de persona si existe
        Observación: formData.Observación?.trim() || ''
      };

      let response;
      if (registro) {
        response = await window.electronAPI?.registros.actualizar({
          id: registro.id,
          persona_id: formData.persona_id,
          expediente_id: formData.expediente_id,
          ...datosRegistro
        }, usuario);
      } else {
        response = await window.electronAPI?.registros.agregar(datosRegistro, usuario);
      }

      if (response?.success) {
        mostrarExito(registro ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
        // Esperar a que se recarguen los datos antes de cerrar el modal
        await onSave(response.registro || { ...datosRegistro, id: Date.now() });
      } else {
        mostrarError('Error al guardar registro', response?.error || 'Error desconocido');
      }
    } catch (error) {
      mostrarError('Error de conexiÃ³n', 'No se pudo guardar el registro');
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
                  disabled={!!personaEncontrada && !registro}
                  placeholder="Ej: Juan Pérez García"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                <div className="relative">
                  <input
                    type="text"
                    id="dni"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    maxLength={8}
                    placeholder="Ej: 12345678"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      personaEncontrada
                        ? 'border-green-500 bg-green-50'
                        : errores.dni
                          ? 'border-red-500'
                          : 'border-gray-300'
                    }`}
                  />
                  {buscandoDni && (
                    <div className="absolute right-3 top-2.5">
                      <FaSearch className="text-gray-400 animate-pulse" />
                    </div>
                  )}
                  {personaEncontrada && !buscandoDni && (
                    <div className="absolute right-3 top-2.5">
                      <FaCheckCircle className="text-green-600" />
                    </div>
                  )}
                </div>
                {personaEncontrada && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <FaCheckCircle />
                    Persona encontrada - Datos autocompletados
                  </p>
                )}
                {errores.dni && (
                  <p className="mt-1 text-sm text-red-600">{errores.dni}</p>
                )}
              </div>

              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-2">
                  NÃºmero (opcional)
                </label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  disabled={!!personaEncontrada && !registro}
                  placeholder="Ej: 001-2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Recibido</option>
                  <option value={2}>En Caja</option>
                  <option value={3}>Entregado</option>
                  <option value={4}>Tesoreria</option>
                </select>
              </div>

              <div>
                <label htmlFor="fecha_registro" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Registro
                </label>
                <input
                  type="date"
                  id="fecha_registro"
                  name="fecha_registro"
                  value={formData.fecha_registro}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="fecha_en_caja" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha en Caja {parseInt(formData.estado_id) === 2 ? '(Automática, editable)' : ''}
                </label>
                <input
                  type="date"
                  id="fecha_en_caja"
                  name="fecha_en_caja"
                  value={formData.fecha_en_caja}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {parseInt(formData.estado_id) === 2 && (
                  <p className="mt-1 text-sm text-gray-500">
                    La fecha se establece automáticamente cuando el estado es "En Caja", pero puede editarla manualmente
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="Observación" className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciónes
                </label>
                <textarea
                  id="Observación"
                  name="Observación"
                  value={formData.Observación}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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





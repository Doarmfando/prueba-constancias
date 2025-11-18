import React, { useState, useEffect } from 'react';
import { FaSearch, FaFileAlt, FaFilePdf, FaCalendarAlt, FaUser, FaIdCard, FaFilter, FaSync } from 'react-icons/fa';
import { mostrarError, formatearFecha } from '../utils/alertas';
import Paginacion from '../components/Paginacion';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { FaDownload } from 'react-icons/fa';
import { useRealtimeSync } from '../hooks/useRealtimeData';
import { toast } from 'react-toastify';

function Registros() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;
  const [incluirFechaPdf, setIncluirFechaPdf] = useState(false);
  // Función auxiliar para obtener fecha local sin desfase UTC
  const getFechaLocal = () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [fechaPdf, setFechaPdf] = useState(getFechaLocal());
  const [nombrePdf, setNombrePdf] = useState('Registros Generales');
  const [mostrarModalPdf, setMostrarModalPdf] = useState(false);

  // Realtime
  const { conectado, sincronizando } = useRealtimeSync(
    'registros',
    cargarRegistros,
    {
      habilitado: window.__WEB_BRIDGE__ === true,
      debounceMs: 500,
      onCambio: (evento) => {
        const msgs = { INSERT: '✨ Nuevo registro', UPDATE: '🔄 Actualizado', DELETE: '🗑️ Eliminado' };
        if (msgs[evento.tipo]) toast.info(msgs[evento.tipo], { position: 'bottom-right', autoClose: 2000 });
      }
    }
  );

  useEffect(() => {
    // Configurar fuentes de pdfmake con fallback para evitar undefined
    const fuentes = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
    if (pdfMake && fuentes) {
      pdfMake.vfs = fuentes;
    }
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

    if (filtroProyecto !== 'todos') {
      const nombreProyecto = registro.proyecto_nombre || 'Proyecto público';
      if (nombreProyecto !== filtroProyecto) return false;
    }

    if (filtroEstado === 'todos') return true;
    return (registro.estado || '').toLowerCase() === filtroEstado.toLowerCase();
  });

  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const registrosPaginados = registrosFiltrados.slice(indiceInicio, indiceInicio + registrosPorPagina);

  // Resetear a pagina 1 cuando cambia el filtro o busqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, busqueda, filtroProyecto]);

  const estadisticas = {
    total: registros.length,
    recibidos: registros.filter(r => r.estado === 'Recibido').length,
    enCaja: registros.filter(r => r.estado === 'En Caja').length,
    entregados: registros.filter(r => r.estado === 'Entregado').length,
    tesoreria: registros.filter(r => r.estado === 'Tesoreria').length
  };

  const exportarPDF = () => {
    const ahora = new Date();
    const formatearFechaTabla = (valor) => {
      if (!valor || valor === 'No entregado') return valor || '---';
      const d = new Date(valor);
      return Number.isNaN(d.getTime()) ? '---' : d.toLocaleDateString('es-ES');
    };
    const formatearFechaInput = (valor) => {
      if (!valor) return null;
      const partes = valor.split('-');
      if (partes.length === 3) {
        const [yyyy, mm, dd] = partes;
        return `${dd}/${mm}/${yyyy}`;
      }
      return valor;
    };
    const fechaExportacion = incluirFechaPdf && fechaPdf ? formatearFechaInput(fechaPdf) : null;

    const contenidoTabla = registrosFiltrados.length > 0
      ? {
          table: {
            headerRows: 1,
            widths: ['5%', '17%', '11%', '17%', '11%', '13%', '11%', '15%'],
            body: [
              [
                { text: '#', style: 'tableHeader' },
                { text: 'Nombre', style: 'tableHeader' },
                { text: 'DNI', style: 'tableHeader' },
                { text: 'Expediente', style: 'tableHeader' },
                { text: 'Número', style: 'tableHeader' },
                { text: 'Fecha Registro', style: 'tableHeader' },
                { text: 'Estado', style: 'tableHeader' },
                { text: 'Fecha en Caja', style: 'tableHeader' }
              ],
              ...registrosFiltrados.map((r, i) => ([
                { text: (i + 1).toString(), style: 'tableCell' },
                { text: r.nombre || '---', style: 'tableCell' },
                { text: r.dni || '---', style: 'tableCell' },
                { text: r.expediente || r.codigo || '---', style: 'tableCell' },
                { text: r.numero || '---', style: 'tableCell' },
                { text: formatearFechaTabla(r.fecha_registro) || '---', style: 'tableCell' },
                { text: r.estado || '---', style: 'tableCell' },
                { text: formatearFechaTabla(r.fecha_en_caja) || '---', style: 'tableCell' }
              ]))
            ]
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? '#3b82f6' : (rowIndex % 2 === 0 ? '#f9fafb' : null)),
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
            vLineWidth: () => 0.5,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          }
        }
      : { text: 'No hay registros para exportar con los filtros actuales.', style: 'info', italics: true, color: '#6b7280' };

    const contenido = [
      { text: nombrePdf || 'Registros Generales', style: 'header' },
      ...(fechaExportacion ? [{ text: `Fecha de exportación: ${fechaExportacion}`, margin: [0, 0, 0, 10], style: 'subheader' }] : []),
      contenidoTabla
    ];

    const docDefinition = {
      content: contenido,
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
        subheader: { fontSize: 10, color: '#555' },
        tableHeader: { bold: true, color: '#ffffff', fillColor: '#3b82f6', fontSize: 10 },
        tableCell: { fontSize: 9 },
        info: { fontSize: 10 }
      },
      defaultStyle: { fontSize: 9 }
    };

    const nombreArchivo = (nombrePdf || 'registros_generales')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]/g, '') || 'registros_generales';

    pdfMake.createPdf(docDefinition).download(`${nombreArchivo}.pdf`);
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

  const proyectosDisponibles = Array.from(
    new Set(
      registros
        .map((r) => r.proyecto_nombre || 'Proyecto público')
        .filter(Boolean)
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros Generales</h1>
          <p className="text-gray-600 mt-1">
            Consulta los registros de todos los proyectos públicos desde una sola vista
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={() => setMostrarModalPdf(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <FaFilePdf className="text-sm" />
            <span>Exportar PDF</span>
          </button>
        </div>
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

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative">
              <select
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              >
                <option value="todos">Todos los proyectos</option>
                {proyectosDisponibles.map((proyecto) => (
                  <option key={proyecto} value={proyecto}>
                    {proyecto}
                  </option>
                ))}
              </select>
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Buscar registros..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
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
                registrosPaginados.map((registro, idx) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      {indiceInicio + idx + 1}
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
                            {registro.nombre || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">
                            DNI: {registro.dni || 'Sin DNI'} | Nº: {registro.numero || 'Sin número'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {registro.proyecto_nombre || 'Proyecto público'}
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

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaFilter className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Vista general de registros</p>
            <p>Consulta y filtra los registros activos de los proyectos públicos. La edición y creación se realizan desde cada proyecto para respetar permisos y contexto.</p>
          </div>
        </div>
      </div>

      {/* Modal Exportar PDF */}
      {mostrarModalPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FaDownload className="text-lg" />
                Exportar a PDF
              </h3>
              <button
                onClick={() => setMostrarModalPdf(false)}
                className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
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
                  value={nombrePdf}
                  onChange={(e) => setNombrePdf(e.target.value)}
                  placeholder="Ej: Reporte de Registros - Enero 2024"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Este título aparecerá en el encabezado y nombre del PDF
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirFechaPdf}
                    onChange={(e) => {
                      setIncluirFechaPdf(e.target.checked);
                      if (e.target.checked) {
                        setFechaPdf(getFechaLocal());
                      }
                    }}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Incluir fecha
                  </span>
                </label>
                {incluirFechaPdf && (
                  <div className="mt-3 ml-8">
                    <input
                      type="date"
                      value={fechaPdf}
                      onChange={(e) => setFechaPdf(e.target.value)}
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
                      <li>Tabla con {registrosFiltrados.length} registros filtrados</li>
                      {incluirFechaPdf && fechaPdf && <li>Fecha personalizada en encabezado</li>}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setMostrarModalPdf(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    exportarPDF();
                    setMostrarModalPdf(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

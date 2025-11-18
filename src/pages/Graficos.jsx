import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { FaChartPie, FaChartBar, FaFileAlt, FaClock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { mostrarError } from '../utils/alertas';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// Componente de tarjeta estadística
const StatCard = ({ title, value, color, icon }) => (
  <div className={`rounded-xl p-5 shadow-lg text-white ${color} transform hover:scale-105 transition-transform duration-200`}>
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-medium tracking-wide opacity-90">{title}</h4>
        <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
      </div>
      <span className="text-2xl opacity-80">{icon}</span>
    </div>
  </div>
);

function Graficos() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroAnio, setFiltroAnio] = useState('Todo');
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [registrosRaw, setRegistrosRaw] = useState([]);

  useEffect(() => {
    cargarEstadisticas();
  }, [filtroAnio]);

  const cargarEstadisticas = async () => {
    try {
      setCargando(true);

      // Obtener registros reales
      const response = await window.electronAPI?.registros.obtener();
      let registros = [];

      if (response && Array.isArray(response)) {
        registros = response;
      } else if (response && response.success && response.data) {
        registros = response.data;
      } else if (response && Array.isArray(response.registros)) {
        registros = response.registros;
      }

      const filtrarPorAnio = (lista) => {
        if (filtroAnio === 'Todo') return lista;
        const anioNum = parseInt(filtroAnio, 10);
        if (Number.isNaN(anioNum)) return lista;
        return lista.filter(r => {
          if (!r.fecha_registro) return false;
          const y = new Date(r.fecha_registro).getFullYear();
          return y === anioNum;
        });
      };

      const registrosFiltrados = filtrarPorAnio(registros);

      // Calcular estadísticas reales (solo visibles según filtro)
      const total = registrosFiltrados.length;
      const recibidos = registrosFiltrados.filter(r => r.estado === 'Recibido').length;
      const enCaja = registrosFiltrados.filter(r => r.estado === 'En Caja').length;
      const entregados = registrosFiltrados.filter(r => r.estado === 'Entregado').length;
      const tesoreria = registrosFiltrados.filter(r => r.estado === 'Tesoreria').length;

      // Agrupar por estado
      const porEstado = {
        'Recibido': recibidos,
        'En Caja': enCaja,
        'Entregado': entregados,
        'Tesorería': tesoreria
      };

      // Agrupar por mes
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const porMes = {};

      meses.forEach((mes, index) => {
        const mesNum = index + 1;
        const registrosDelMes = registrosFiltrados.filter(r => {
          if (!r.fecha_registro) return false;
          const fecha = new Date(r.fecha_registro);
          const mesRegistro = fecha.getMonth() + 1;
          return mesRegistro === mesNum;
        });
        porMes[mes] = registrosDelMes.length;
      });

      const stats = {
        total,
        pendientes: recibidos,
        aprobados: entregados,
        rechazados: 0,
        porEstado,
        porMes
      };

      setEstadisticas(stats);
      setRegistrosRaw(registros);

      const years = Array.from(new Set(
        registros
          .map(r => r.fecha_registro)
          .filter(Boolean)
          .map(f => new Date(f).getFullYear())
          .filter(y => !Number.isNaN(y))
      )).sort((a, b) => b - a).map(String);
      setAniosDisponibles(years);
      setCargando(false);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      mostrarError('Error al cargar estadísticas', 'No se pudieron cargar las estadísticas');
      setCargando(false);
    }
  };

  const pieChartData = {
    labels: estadisticas ? Object.keys(estadisticas.porEstado) : [],
    datasets: [{
      data: estadisticas ? Object.values(estadisticas.porEstado) : [],
      backgroundColor: ['#3b82f6', '#fbbf24', '#10b981', '#a855f7'],
      borderColor: ['#1d4ed8', '#f59e0b', '#059669', '#7e22ce'],
      borderWidth: 2
    }]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  const barChartData = {
    labels: estadisticas ? Object.keys(estadisticas.porMes) : [],
    datasets: [{
      label: 'Registros por Mes',
      data: estadisticas ? Object.values(estadisticas.porMes) : [],
      backgroundColor: '#3b82f6',
      borderColor: '#1d4ed8',
      borderWidth: 1
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas y Gráficos</h1>
          <p className="text-gray-600 mt-1">
            Resumen visual de todos los registros del sistema
          </p>
        </div>

        {/* Filtros */}
        <div className="flex space-x-3 items-center">
          <span className="text-sm text-gray-700 font-medium">Año (fecha de registro)</span>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Todo">Todos los años</option>
            {aniosDisponibles.length === 0 && <option value="" disabled>No hay registros</option>}
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                Año {anio}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas?.total || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFileAlt className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{estadisticas?.pendientes || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaClock className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas?.aprobados || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaCheckCircle className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rechazados</p>
              <p className="text-2xl font-bold text-red-600">{estadisticas?.rechazados || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FaExclamationCircle className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de pastel */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center space-x-2 mb-4">
            <FaChartPie className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Distribución por Estado
            </h3>
          </div>
          <div className="h-80">
            {estadisticas && <Pie data={pieChartData} options={pieChartOptions} />}
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center space-x-2 mb-4">
            <FaChartBar className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Registros por Mes
            </h3>
          </div>
          <div className="h-80">
            {estadisticas && <Bar data={barChartData} options={barChartOptions} />}
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Resumen del filtro actual</p>
          <p>
            <strong>Total de registros:</strong> {estadisticas?.total || 0} |
            <strong> Basado en:</strong> Fecha de Registro
            {filtroAnio !== 'Todo' && ` - Año ${filtroAnio}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Graficos;

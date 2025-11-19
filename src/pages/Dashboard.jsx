
// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFolderOpen, FaTrashAlt, FaUser, FaPlus,
  FaGlobe, FaHistory, FaSearch, FaBoxOpen, FaChartBar, FaFileAlt,
  FaCalendarDay, FaTrendingUp, FaExclamationTriangle, FaCheckCircle
} from "react-icons/fa";
import {
  MdInsertChart, MdDashboard, MdWork, MdPublic, MdSettings,
  MdNotifications, MdRefresh, MdVisibility
} from "react-icons/md";
import { useRealtimeSync } from '../hooks/useRealtimeData';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRegistros: 0,
    registrosHoy: 0,
    proyectos: 0
  });
  const [loading, setLoading] = useState(true);

  // Realtime - actualizar cuando cambie cualquier registro
  useRealtimeSync('registros', () => cargarEstadisticas({ mostrarLoading: false }), {
    habilitado: true,
    debounceMs: 1000
  });

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    cargarEstadisticas({ mostrarLoading: true });
  }, []);

  const cargarEstadisticas = async ({ mostrarLoading = false } = {}) => {
    try {
      if (mostrarLoading) setLoading(true);

      // Obtener usuario actual
      const usuarioActual = JSON.parse(localStorage.getItem('sesion_usuario') || '{}');

      // Código para cargar estadísticas (compatible con Electron y Web)
      try {
        const api = window.electronAPI || window.__WEB_BRIDGE__;

        // Obtener estadísticas de registros
        const registrosResp = await api?.dashboard?.obtenerEstadisticas();

        // Obtener proyectos del usuario
        let cantidadProyectos = 0;
        try {
          // En modo web usa obtenerMisProyectos
          const proyectosResp = await api?.proyectos?.obtenerMisProyectos(usuarioActual.id, usuarioActual);

          console.log('📊 Dashboard - Proyectos respuesta:', proyectosResp);

          // La respuesta puede venir como { success: true, proyectos: [...] } o directamente [...]
          const proyectos = proyectosResp?.proyectos || proyectosResp || [];
          cantidadProyectos = Array.isArray(proyectos) ? proyectos.length : 0;
        } catch (errorProyectos) {
          console.error('Error obteniendo proyectos:', errorProyectos);
          cantidadProyectos = 0;
        }

        console.log('📊 Dashboard - Estadísticas finales:', {
          totalRegistros: registrosResp?.total || 0,
          registrosHoy: registrosResp?.hoy || 0,
          proyectos: cantidadProyectos
        });

        setStats({
          totalRegistros: registrosResp?.total || 0,
          registrosHoy: registrosResp?.hoy || 0,
          proyectos: cantidadProyectos
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar estadísticas por defecto si hay error
        setStats({
          totalRegistros: 0,
          registrosHoy: 0,
          proyectos: 0
        });
      }
      setLoading(false);

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Registros",
      value: stats.totalRegistros,
      icon: <FaFolderOpen className="text-blue-500 text-2xl" />,
      color: "bg-blue-50 border-blue-200",
      path: "/registros"
    },
    {
      title: "Proyectos",
      value: stats.proyectos,
      icon: <MdWork className="text-purple-500 text-2xl" />,
      color: "bg-purple-50 border-purple-200",
      path: "/mis-proyectos"
    }
  ];

  const quickActions = [
    {
      title: "Crear Proyecto",
      description: "Inicia un nuevo proyecto de registros",
      icon: <FaPlus className="text-indigo-500 text-xl" />,
      path: "/crear-proyecto",
      color: "hover:bg-indigo-50"
    },
    {
      title: "Ver Registros",
      description: "Gestiona todos los registros del sistema",
      icon: <FaFileAlt className="text-blue-500 text-xl" />,
      path: "/registros",
      color: "hover:bg-blue-50"
    },
    {
      title: "Estadísticas",
      description: "Análisis y gráficos del sistema",
      icon: <FaChartBar className="text-sky-500 text-xl" />,
      path: "/estadisticas",
      color: "hover:bg-sky-50"
    },
    {
      title: "Proyectos Públicos",
      description: "Explora proyectos compartidos",
      icon: <MdPublic className="text-green-500 text-xl" />,
      path: "/proyectos-publicos",
      color: "hover:bg-green-50"
    },
    {
      title: "Mis Proyectos",
      description: "Gestiona tus proyectos personales",
      icon: <FaFolderOpen className="text-purple-500 text-xl" />,
      path: "/mis-proyectos",
      color: "hover:bg-purple-50"
    },
    {
      title: "Personas",
      description: "Administra el registro de personas",
      icon: <FaUser className="text-orange-500 text-xl" />,
      path: "/personas",
      color: "hover:bg-orange-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Bienvenido al sistema de control de documentos A30%</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={cargarEstadisticas}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MdRefresh className="mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas Generales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((card, index) => (
              <div
                key={index}
                onClick={() => navigate(card.path)}
                className={`${card.color} rounded-xl p-6 cursor-pointer hover:shadow-md transition-all duration-200 border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {loading ? "..." : card.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Módulos del Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={() => navigate(action.path)}
                className={`bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all duration-200 ${action.color}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Información del sistema */}
        <div className="mt-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MdDashboard className="text-blue-600 text-2xl" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Sistema de Control de Documentos A30</h3>
                <p className="text-sm text-gray-600">
                  Gestiona eficientemente todos tus registros, proyectos y estadísticas desde un solo lugar.
                  El sistema ofrece módulos integrados para administración completa de documentos.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                     Proyectos
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                     Estadísticas
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                     Personas
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                     Registros
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

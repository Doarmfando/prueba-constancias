
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

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRegistros: 0,
    registrosHoy: 0,
    papeleria: 0,
    proyectos: 0
  });
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);

      // Código real para cargar estadísticas de la base de datos:
      try {
        const [registros, papeleria] = await Promise.all([
          window.electronAPI?.dashboard.obtenerEstadisticas(),
          window.electronAPI?.registros.obtenerBorrados()
        ]);

        setStats({
          totalRegistros: registros?.total || 0,
          registrosHoy: registros?.hoy || 0,
          papeleria: papeleria?.length || 0,
          proyectos: 1 // Proyecto por defecto creado
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar estadísticas por defecto si hay error
        setStats({
          totalRegistros: 0,
          registrosHoy: 0,
          papeleria: 0,
          proyectos: 1
        });
      }
      setLoading(false);

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
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
      title: "Hoy",
      value: stats.registrosHoy,
      icon: <FaCalendarDay className="text-green-500 text-2xl" />,
      color: "bg-green-50 border-green-200",
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
      title: "Ver Estadísticas",
      description: "Análisis y gráficos del sistema",
      icon: <MdInsertChart className="text-sky-500 text-xl" />,
      path: "/graficos",
      color: "hover:bg-sky-50"
    },
    {
      title: "Proyectos Públicos",
      description: "Explora proyectos compartidos",
      icon: <MdPublic className="text-blue-500 text-xl" />,
      path: "/proyectos-publicos",
      color: "hover:bg-blue-50"
    },
    {
      title: "Auditoría",
      description: "Registro de actividades del sistema",
      icon: <FaHistory className="text-gray-500 text-xl" />,
      path: "/auditoria",
      color: "hover:bg-gray-50"
    }
  ];

  const recentActivity = [
    { action: "Proyecto publicado", time: "Hace 15 minutos", type: "info" },
    { action: "Usuario eliminado", time: "Hace 1 hora", type: "warning" },
    { action: "Datos exportadosos", time: "Hace 2 horas", type: "success" }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Acciones Rápidas */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Actividad Reciente */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' :
                      activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate('/auditoria')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver todo el historial→
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Módulos Legacy */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Módulos Legacy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => navigate('/registros')}
              className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <FaFolderOpen className="text-indigo-500 text-2xl" />
                <div>
                  <h3 className="font-semibold text-gray-900">Registros</h3>
                  <p className="text-sm text-gray-600">Sistema legacy de registros</p>
                </div>
              </div>
            </div>
            <div
              onClick={() => navigate('/papeleria')}
              className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <FaTrashAlt className="text-rose-500 text-2xl" />
                <div>
                  <h3 className="font-semibold text-gray-900">Papelería</h3>
                  <p className="text-sm text-gray-600">Registros eliminados</p>
                </div>
              </div>
            </div>
            <div
              onClick={() => navigate('/graficos')}
              className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <MdInsertChart className="text-sky-500 text-2xl" />
                <div>
                  <h3 className="font-semibold text-gray-900">Gráficos</h3>
                  <p className="text-sm text-gray-600">Estadísticas visuales</p>
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



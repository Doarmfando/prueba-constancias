import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaHome,
  FaFolderOpen,
  FaPlus,
  FaGlobe,
  FaUsers,
  FaClipboardList,
  FaInfoCircle,
  FaDatabase,
  FaFileAlt,
  FaPrint,
  FaChartBar,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaLock
} from 'react-icons/fa';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout, esAdministrador } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Función para filtrar los items del menú según el rol del usuario
  const obtenerMenuItems = () => {
    const menuBase = [
      {
        section: "Principal",
        items: [
          { path: "/dashboard", icon: FaHome, label: "Dashboard" },
        ]
      },
      {
        section: "Mi Área de Trabajo",
        items: [
          { path: "/mis-proyectos", icon: FaFolderOpen, label: "Mis Proyectos" },
          { path: "/crear-proyecto", icon: FaPlus, label: "Crear Proyecto" },
        ]
      },
      {
        section: "Área Pública",
        items: [
          { path: "/proyectos-publicos", icon: FaGlobe, label: "Proyectos Públicos" },
        ]
      }
    ];

    // Solo mostrar sección de administración si es administrador
    if (esAdministrador()) {
      menuBase.push({
        section: "Administración",
        items: [
          { path: "/usuarios", icon: FaUsers, label: "Usuarios" },
          { path: "/auditoria", icon: FaClipboardList, label: "Auditoría" },
          { path: "/proyectos-privados", icon: FaLock, label: "Proyectos Privados" },
        ]
      });
    }

    menuBase.push(
      {
        section: "Herramientas",
        items: [
          { path: "/informacion", icon: FaInfoCircle, label: "Información" },
          { path: "/gestion-datos", icon: FaDatabase, label: "Gestión de Datos" },
        ]
      },
      {
        section: "Legacy (Compatibilidad)",
        items: [
          { path: "/registros", icon: FaFileAlt, label: "Registros" },
          { path: "/papeleria", icon: FaPrint, label: "Papelería" },
          { path: "/graficos", icon: FaChartBar, label: "Gráficos" },
        ]
      }
    );

    return menuBase;
  };

  const menuItems = obtenerMenuItems();

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 ease-in-out
        w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Sistema de Gestión</h1>
            <p className="text-sm text-gray-600">Panel de Control</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6">
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.section}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <button
                        key={itemIndex}
                        onClick={() => handleNavigation(item.path)}
                        className={`
                          w-full flex items-center px-4 py-2 text-sm font-medium transition-colors
                          ${active
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <Icon className={`mr-3 flex-shrink-0 ${active ? 'text-blue-500' : 'text-gray-400'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {usuario?.nombre?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{usuario?.nombre || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{usuario?.rol || 'usuario'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Cerrar sesión"
              >
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer para el contenido principal en desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0"></div>
    </>
  );
}

export default Navbar;
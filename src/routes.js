import React, { lazy, Suspense, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

// 📦 Carga diferida de las páginas
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const MisProyectos = lazy(() => import("./pages/MisProyectos"));
const CrearProyecto = lazy(() => import("./pages/CrearProyecto"));
const ProyectoDetalle = lazy(() => import("./pages/ProyectoDetalle"));
const ProyectosPublicos = lazy(() => import("./pages/ProyectosPublicos"));
const ProyectosPrivados = lazy(() => import("./pages/ProyectosPrivados"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const Informacion = lazy(() => import("./pages/Informacion"));
const GestionDatos = lazy(() => import("./pages/GestionDatos"));
const Personas = lazy(() => import("./pages/Personas"));
const PersonaDetalle = lazy(() => import("./pages/PersonaDetalle"));
// Rutas legacy (mantener por compatibilidad)
const Registros = lazy(() => import("./pages/Registros"));
const Papeleria = lazy(() => import("./pages/Papeleria"));
const Graficos = lazy(() => import("./pages/Graficos"));

function AppWithNavigationHandler({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (_, dni) => {
      if (dni) {
        navigate(`/informacion/${dni}`);
      }
    };

    window.electron?.ipcRenderer?.on("navegar-a-informacion", handler);

    return () => {
      window.electron?.ipcRenderer?.removeListener("navegar-a-informacion", handler);
    };
  }, [navigate]);

  return children;
}

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  const { estaAutenticado, estaCargando } = useAuth();

  if (estaCargando()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!estaAutenticado()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Navbar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// Componente para rutas de admin
function AdminRoute({ children }) {
  const { estaAutenticado, estaCargando, esAdministrador } = useAuth();

  if (estaCargando()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!estaAutenticado()) {
    return <Navigate to="/login" replace />;
  }

  if (!esAdministrador()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Navbar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// Componente para rutas públicas (solo mostrar si NO está autenticado)
function PublicRoute({ children }) {
  const { estaAutenticado, estaCargando } = useAuth();

  if (estaCargando()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (estaAutenticado()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<div className="flex justify-center items-center h-screen text-xl">🔄 Cargando...</div>}>
        <AppWithNavigationHandler>
          <Routes>
            {/* Ruta de login */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Rutas principales (sin autenticación temporalmente) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* 📂 Mi Área de Trabajo */}
            <Route path="/mis-proyectos" element={<ProtectedRoute><MisProyectos /></ProtectedRoute>} />
            <Route path="/crear-proyecto" element={<ProtectedRoute><CrearProyecto /></ProtectedRoute>} />
            <Route path="/proyecto/:id" element={<ProtectedRoute><ProyectoDetalle /></ProtectedRoute>} />
            <Route path="/proyecto/:id/editar" element={<ProtectedRoute><CrearProyecto /></ProtectedRoute>} />

            {/* 🌐 Área Pública */}
            <Route path="/proyectos-publicos" element={<ProtectedRoute><ProyectosPublicos /></ProtectedRoute>} />

            {/* 👥 Administración (solo admin) */}
            <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
            <Route path="/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
            <Route path="/proyectos-privados" element={<AdminRoute><ProyectosPrivados /></AdminRoute>} />

            {/* 🔧 Herramientas */}
            <Route path="/personas" element={<ProtectedRoute><Personas /></ProtectedRoute>} />
            <Route path="/persona/:id" element={<ProtectedRoute><PersonaDetalle /></ProtectedRoute>} />
            <Route path="/informacion" element={<ProtectedRoute><Informacion /></ProtectedRoute>} />
            <Route path="/informacion/:dni" element={<ProtectedRoute><Informacion /></ProtectedRoute>} />
            <Route path="/gestion-datos" element={<ProtectedRoute><GestionDatos /></ProtectedRoute>} />

            {/* Rutas legacy (mantener por compatibilidad) */}
            <Route path="/registros" element={<ProtectedRoute><Registros /></ProtectedRoute>} />
            <Route path="/papeleria" element={<ProtectedRoute><Papeleria /></ProtectedRoute>} />
            <Route path="/graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />

            {/* Ruta 404 */}
            <Route path="*" element={
              <ProtectedRoute>
                <div className="text-center text-red-600 p-10">
                  ⚠️ Página no encontrada
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </AppWithNavigationHandler>
      </Suspense>
    </Router>
  );
}

export default AppRoutes;

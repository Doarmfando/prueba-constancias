import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseUser } from '../config/supabaseBrowser';

const AuthContext = createContext();

// Detectar si estamos en modo Electron o Web
const isElectron = () => typeof window !== 'undefined' && window.electronAPI !== undefined;

// Helper para login en modo web
const loginWeb = async (nombre_usuario, password) => {
  const API_URL = 'http://localhost:3001/api';
  const response = await fetch(`${API_URL}/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: nombre_usuario, contraseña: password })
  });
  return await response.json();
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión guardada
    const usuarioGuardado = localStorage.getItem('sesion_usuario');
    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch (error) {
        localStorage.removeItem('sesion_usuario');
      }
    }
    setCargando(false);
  }, []);

  // Cerrar sesión automáticamente cuando se cierra la ventana del navegador
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      // Solo en modo web (navegador), no en Electron
      if (!isElectron() && usuario) {
        // Registrar logout en auditoría
        if (usuario?.id) {
          try {
            // Usar sendBeacon para garantizar que se envíe antes de cerrar
            const API_URL = 'http://localhost:3001/api';

            // sendBeacon requiere un Blob con tipo application/json
            const data = new Blob([JSON.stringify({
              id: usuario.id,
              nombre_usuario: usuario.nombre_usuario,
              rol: usuario.rol
            })], { type: 'application/json' });

            // sendBeacon es más confiable que fetch para eventos beforeunload
            navigator.sendBeacon(`${API_URL}/auditoria/logout`, data);
          } catch (error) {
            console.error('Error registrando logout:', error);
          }
        }

        // Limpiar sesión de Supabase
        if (supabaseUser) {
          try {
            await supabaseUser.auth.signOut();
          } catch (error) {
            console.warn('Error en signOut:', error);
          }
        }

        // Limpiar localStorage
        localStorage.removeItem('sesion_usuario');
      }
    };

    // Solo agregar el listener si hay usuario autenticado
    if (usuario && !isElectron()) {
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup: remover el listener cuando el componente se desmonte
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [usuario]);

  const login = async (nombre_usuario, password) => {
    try {
      let response;

      if (isElectron()) {
        // Modo Electron
        response = await window.electronAPI.auth.login(nombre_usuario, password);
      } else {
        // Modo Web
        response = await loginWeb(nombre_usuario, password);
      }

      if (response.success) {
        const usuarioData = response.usuario;
        setUsuario(usuarioData);
        localStorage.setItem('sesion_usuario', JSON.stringify(usuarioData));
        return usuarioData;
      } else {
        throw new Error(response.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const usuarioPrevio = usuario;

      // 1) Cerrar sesión en Supabase (limpia tokens/localStorage/cookies)
      if (supabaseUser) {
        try {
          await supabaseUser.auth.signOut();
        } catch (errorSignOut) {
          console.warn('Supabase signOut falló (continuando logout local):', errorSignOut);
        }
      }

      // 2) Limpiar cache local
      setUsuario(null);
      localStorage.removeItem('sesion_usuario');

      // 3) Registrar logout en auditoría (web bridge o electron)
      if (usuarioPrevio?.id) {
        window.electronAPI?.auditoria?.registrarLogout({
          id: usuarioPrevio.id,
          nombre_usuario: usuarioPrevio.nombre_usuario,
          rol: usuarioPrevio.rol
        });
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const estaAutenticado = () => {
    return !!usuario;
  };

  const esAdministrador = () => {
    return usuario?.rol === 'administrador';
  };

  const estaCargando = () => {
    return cargando;
  };

  const value = {
    usuario,
    login,
    logout,
    estaAutenticado,
    esAdministrador,
    estaCargando
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

export default AuthContext;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { mostrarExito, mostrarError } from '../utils/alertas';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    nombre_usuario: '',
    password: ''
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});

  const navigate = useNavigate();
  const { login, estaAutenticado } = useAuth();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (estaAutenticado()) {
      navigate('/dashboard');
    }
  }, [estaAutenticado, navigate]);

  const handleChange = (e) => {
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

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre_usuario.trim()) {
      nuevosErrores.nombre_usuario = 'El nombre de usuario es obligatorio';
    }

    if (!formData.password) {
      nuevosErrores.password = 'La contraseña es obligatoria';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setCargando(true);
    setErrores({});

    try {
      await login(formData.nombre_usuario, formData.password);
      mostrarExito('Sesión iniciada correctamente');
      navigate('/dashboard');
    } catch (error) {
      mostrarError('Error de autenticación', error.message);
      setErrores({ general: error.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Sesión</h1>
          <p className="text-gray-600">Control de Documentos A30%</p>
        </div>

        {errores.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{errores.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nombre_usuario" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                id="nombre_usuario"
                name="nombre_usuario"
                value={formData.nombre_usuario}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errores.nombre_usuario ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingresa tu nombre de usuario"
              />
            </div>
            {errores.nombre_usuario && (
              <p className="mt-1 text-sm text-red-600">{errores.nombre_usuario}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errores.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingresa tu contraseña"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {mostrarPassword ? (
                  <FaEyeSlash className="text-gray-400 hover:text-gray-600" />
                ) : (
                  <FaEye className="text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errores.password && (
              <p className="mt-1 text-sm text-red-600">{errores.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Sistema de autenticación activo</strong><br/>
              Ingresa tus credenciales para acceder
            </p>
          </div>
          <p className="text-sm text-gray-500">Credenciales de prueba:</p>
          <p className="text-xs text-gray-400 mt-1">
            Usuario: <span className="font-mono bg-gray-100 px-1 rounded">admin</span> |
            Contraseña: <span className="font-mono bg-gray-100 px-1 rounded">hello123</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
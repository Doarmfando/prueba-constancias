import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Shield, User, CheckCircle } from 'lucide-react';
import { mostrarError, mostrarExito } from '../utils/alertas';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    nombre_usuario: '',
    password: '',
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();
  const { login, estaAutenticado } = useAuth();

  useEffect(() => {
    if (estaAutenticado()) {
      navigate('/dashboard');
    }
  }, [estaAutenticado, navigate]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errores[name]) {
      setErrores((prev) => ({
        ...prev,
        [name]: '',
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

  const handleSubmit = async (event) => {
    event.preventDefault();

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
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-blue-200/30 rounded-full blur-3xl transition-all duration-1000"
          style={{
            left: `${mousePosition.x / 20}px`,
            top: `${mousePosition.y / 20}px`,
          }}
        />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-md text-center">
          <div className="mb-8 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-400/20 rounded-3xl blur-xl animate-pulse" />
              <img
                src="/icono2.ico"
                alt="Logo del sistema"
                className="w-28 h-28 mb-6 drop-shadow-2xl relative z-10 hover:scale-110 transition-transform duration-300"
              />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Sistema de Gestión y
            </h1>
            <h2 className="text-2xl font-light text-blue-700 mb-4">Control de Expedientes A30%</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full mx-auto" />
          </div>

          <p
            className="text-lg text-blue-600/80 leading-relaxed mb-8 animate-fade-in text-center"
            style={{ animationDelay: '0.2s' }}
          >
            Plataforma para la gestión eficiente de documentos y expedientes para el área de Constancias de Pago.
          </p>

          <div className="space-y-4">
            {[
              { icon: CheckCircle, text: 'Gestión de Documentos' },
              { icon: CheckCircle, text: 'Control de Expedientes' },
            ].map((item, index) => (
              <div
                key={item.text}
                className="flex items-center space-x-3 animate-slide-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-blue-700">{item.text}</span>
              </div>
            ))}
          </div>


        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-400/20 rounded-3xl blur-xl animate-pulse" />
              <img
                src="/icono2.ico"
                alt="Logo del sistema"
                className="w-20 h-20 mx-auto mb-4 drop-shadow-2xl relative z-10"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Control de Documentos A30%
            </h1>
          </div>

          <div className="bg-white/80 rounded-3xl shadow-2xl p-8 border border-white/50 hover:shadow-blue-200/50 transition-all duration-300 animate-scale-in">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-2">Bienvenido</h2>
              <p className="text-blue-600/70">Ingresa tus credenciales para continuar</p>
            </div>

            {errores.general && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl animate-shake">
                <p className="text-red-700 text-sm font-medium">{errores.general}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="group">
                <label htmlFor="nombre_usuario" className="block text-sm font-semibold text-blue-900 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 group-focus-within:scale-110">
                    <User className="text-blue-400 group-focus-within:text-blue-600" size={18} />
                  </div>
                  <input
                    type="text"
                    id="nombre_usuario"
                    name="nombre_usuario"
                    value={formData.nombre_usuario}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-4 py-4 bg-blue-50/50 border-2 rounded-xl focus:bg-white focus:border-blue-500
                      focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 ${
                        errores.nombre_usuario ? 'border-red-300 focus:border-red-500 animate-shake' : 'border-blue-200'
                      }`}
                    placeholder="Ingresa tu usuario"
                  />
                </div>
                {errores.nombre_usuario && (
                  <p className="mt-2 text-sm text-red-600 animate-fade-in">{errores.nombre_usuario}</p>
                )}
              </div>

              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-blue-900 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 group-focus-within:scale-110">
                    <Lock className="text-blue-400 group-focus-within:text-blue-600" size={18} />
                  </div>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-14 py-4 bg-blue-50/50 border-2 rounded-xl focus:bg-white focus:border-blue-500
                      focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 ${
                        errores.password ? 'border-red-300 focus:border-red-500 animate-shake' : 'border-blue-200'
                      }`}
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform duration-300"
                  >
                    {mostrarPassword ? (
                      <EyeOff className="text-blue-400 hover:text-blue-600" size={20} />
                    ) : (
                      <Eye className="text-blue-400 hover:text-blue-600" size={20} />
                    )}
                  </button>
                </div>
                {errores.password && <p className="mt-2 text-sm text-red-600 animate-fade-in">{errores.password}</p>}
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold py-4 rounded-xl hover:from-blue-700 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-300/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {cargando ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
              </button>
            </form>

          </div>

          <p className="text-center text-sm text-blue-600/60 mt-6">© 2024 Sistema Constancias A30%</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-in {
          animation: slide-in 0.6s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default Login;

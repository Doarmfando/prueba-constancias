import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import { mostrarExito, mostrarError } from '../utils/alertas';
import { useAuth } from '../context/AuthContext';

function CrearProyecto() {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    es_publico: false
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const { usuario } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
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
      nuevosErrores.nombre = 'El nombre del proyecto es obligatorio';
    } else if (formData.nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      nuevosErrores.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    if (formData.descripcion && formData.descripcion.length > 500) {
      nuevosErrores.descripcion = 'La descripción no puede exceder 500 caracteres';
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

      // Crear proyecto usando la API real
      const response = await window.electronAPI?.proyectos.crear({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        es_publico: formData.es_publico ? 1 : 0,
        permite_edicion: 1  // Siempre permitir edición en proyectos públicos
      }, usuario);

      if (response && response.success) {
        mostrarExito('Proyecto creado correctamente');
        // Siempre navegar a mis-proyectos para ver el proyecto creado
        navigate('/mis-proyectos');
      } else {
        mostrarError('Error al crear proyecto', response?.error || 'Error desconocido');
      }
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo crear el proyecto');
      console.error('Error creando proyecto:', error);
      setGuardando(false);
    }
  };

  const handleCancel = () => {
    if (formData.nombre.trim() || formData.descripcion.trim()) {
      if (window.confirm('¿Estás seguro de que quieres cancelar? Se perderán los cambios.')) {
        navigate('/mis-proyectos');
      }
    } else {
      navigate('/mis-proyectos');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Proyecto</h1>
          <p className="text-gray-600 mt-1">
            Configura tu nuevo proyecto de registros
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg shadow border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre del proyecto */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Ej: Constancias Q1 2025"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errores.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={100}
            />
            {errores.nombre && (
              <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.nombre.length}/100 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              placeholder="Describe brevemente el propósito de este proyecto..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                errores.descripcion ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={500}
            />
            {errores.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errores.descripcion}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.descripcion.length}/500 caracteres
            </p>
          </div>

          {/* Configuración de visibilidad */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Configuración de Acceso</h3>

            <div className="space-y-4">
              {/* Visibilidad */}
              <div className="flex items-start space-x-3">
                <div className="flex items-center h-5">
                  <input
                    id="es_publico"
                    name="es_publico"
                    type="checkbox"
                    checked={formData.es_publico}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="es_publico" className="text-sm font-medium text-gray-700">
                    Hacer público
                  </label>
                  <p className="text-sm text-gray-500">
                    Si está marcado, todos los usuarios podrán ver, crear y editar registros en este proyecto.
                    Si no, solo tú y los administradores podrán acceder.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Información importante</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Puedes cambiar la visibilidad del proyecto en cualquier momento</li>
              <li>• Los proyectos privados solo son visibles para ti y los administradores</li>
              <li>• Los proyectos públicos permiten a todos los usuarios ver, crear y editar registros</li>
              <li>• Solo tú y los administradores pueden editar o eliminar el proyecto en sí</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <FaTimes className="text-sm" />
              <span>Cancelar</span>
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <FaSave className="text-sm" />
              <span>{guardando ? 'Creando...' : 'Crear Proyecto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrearProyecto;
import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaSearch, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { mostrarExito, mostrarError } from '../utils/alertas';

function FormularioRegistro({ mostrar, onCerrar, onRegistroCreado, registroEditar = null }) {
  // Función para obtener fecha local sin desfase UTC
  const getFechaLocal = () => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    numero: '',
    expediente: '',
    estado: 'Recibido',
    fecha_registro: getFechaLocal(),
    fecha_en_caja: ''
  });

  const [guardando, setGuardando] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState(null);
  const [datosAutocompletados, setDatosAutocompletados] = useState(false);

  // Actualizar formData cuando cambie registroEditar
  useEffect(() => {
    if (registroEditar) {
      setFormData({
        nombre: registroEditar.nombre || '',
        dni: registroEditar.dni || '',
        numero: registroEditar.numero || '',
        expediente: registroEditar.expediente || registroEditar.codigo || '',
        estado: registroEditar.estado || 'Recibido',
        fecha_registro: registroEditar.fecha_registro || getFechaLocal(),
        fecha_en_caja: registroEditar.fecha_en_caja || ''
      });
    } else {
      // Limpiar formulario para nuevo registro
      setFormData({
        nombre: '',
        dni: '',
        numero: '',
        expediente: '',
        estado: 'Recibido',
        fecha_registro: getFechaLocal(),
        fecha_en_caja: ''
      });
    }
  }, [registroEditar]);

  const buscarPersonaPorDni = async (dni) => {
    if (!dni || dni.length < 8) {
      setPersonaEncontrada(null);
      setDatosAutocompletados(false);
      return;
    }

    try {
      setBuscandoDni(true);
      const response = await window.electronAPI?.informacion.buscarPersonaPorDni(dni);

      if (response?.success && response.persona) {
        const nombreAuto = response.persona.nombre || [response.persona.nombres, response.persona.apellidos].filter(Boolean).join(' ');
        const numeroAuto = response.persona.numero || (Array.isArray(response.registros) && response.registros[0]?.numero) || '';

        setPersonaEncontrada({ ...response.persona });

        // Autocompletar solo si no estamos editando
        if (!registroEditar) {
          setFormData(prev => ({
            ...prev,
            nombre: nombreAuto || '',
            numero: numeroAuto || ''
          }));
          setDatosAutocompletados(true);
        }
      } else {
        setPersonaEncontrada(null);
        setDatosAutocompletados(false);
      }
    } catch (error) {
      console.error('Error buscando persona:', error);
      setPersonaEncontrada(null);
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let newFormData = {
      ...formData,
      [name]: value
    };

    // Lógica automática de fecha_en_caja según el estado
    if (name === 'estado') {
      if (value === 'En Caja') {
        // Cuando cambia a "En Caja", poner la fecha actual local (editable)
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        newFormData.fecha_en_caja = `${año}-${mes}-${dia}`;
      } else if (value === 'Entregado') {
        // Cuando está "Entregado", dejarlo vacío (---)
        newFormData.fecha_en_caja = '';
      } else if (value === 'Recibido') {
        // Cuando está "Recibido", dejarlo vacío (No entregado/---)
        newFormData.fecha_en_caja = '';
      } else if (value === 'Tesoreria') {
        // Cuando está "Tesoreria", dejarlo vacío (---)
        newFormData.fecha_en_caja = '';
      }
    }

    setFormData(newFormData);

    // Si se modificó el DNI, buscar persona
    if (name === 'dni') {
      buscarPersonaPorDni(value);
    }

    // Si se modificó nombre o número manualmente, desactivar indicador de autocompletado
    if ((name === 'nombre' || name === 'numero') && datosAutocompletados) {
      setDatosAutocompletados(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      let response;

      if (registroEditar) {
        // Actualizar registro existente
        const datosActualizar = {
          ...formData,
          id: registroEditar.id,
          persona_id: registroEditar.persona_id,
          expediente_id: registroEditar.expediente_id
        };
        response = await window.electronAPI?.registros.actualizar(datosActualizar);
      } else {
        // Crear nuevo registro
        const datosCrear = {
          ...formData,
          proyecto_id: 1, // Proyecto por defecto
          usuario_creador_id: 1, // Usuario por defecto
          persona_existente_id: personaEncontrada?.id || null // Enviar ID de persona si existe
        };
        response = await window.electronAPI?.registros.agregar(datosCrear);
      }

      if (response && (response.success || response.registro)) {
        mostrarExito(registroEditar ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
        onRegistroCreado && onRegistroCreado();
        onCerrar();

        // Limpiar formulario si es nuevo registro
        if (!registroEditar) {
          setFormData({
            nombre: '',
            dni: '',
            numero: '',
            expediente: '',
            estado: 'Recibido',
            fecha_registro: getFechaLocal(),
            fecha_en_caja: ''
          });
        }
      } else {
        mostrarError('Error', response?.error || 'No se pudo guardar el registro');
      }
    } catch (error) {
      console.error('Error guardando registro:', error);
      mostrarError('Error', 'No se pudo guardar el registro');
    } finally {
      setGuardando(false);
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FaSave className="text-lg" />
            {registroEditar ? 'Editar Registro' : 'Nuevo Registro'}
          </h3>
          <button
            onClick={onCerrar}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            title="Cerrar"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              disabled={!!personaEncontrada && !registroEditar}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="Ej: Juan Pérez García"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                DNI <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  maxLength="8"
                  required
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900 ${
                    personaEncontrada
                      ? 'border-green-500 bg-green-50'
                      : formData.dni.length === 8 && !buscandoDni
                        ? 'border-blue-300'
                        : 'border-gray-300'
                  }`}
                  placeholder="Ej: 12345678"
                />
                {buscandoDni && (
                  <div className="absolute right-3 top-3.5">
                    <FaSearch className="text-gray-400 animate-pulse" />
                  </div>
                )}
                {personaEncontrada && !buscandoDni && (
                  <div className="absolute right-3 top-3.5">
                    <FaCheckCircle className="text-green-600" />
                  </div>
                )}
              </div>
              {personaEncontrada && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <FaCheckCircle />
                  Persona encontrada - Datos autocompletados
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número
              </label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleInputChange}
                disabled={!!personaEncontrada && !registroEditar}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
                placeholder="Ej: 001-2024"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expediente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="expediente"
              value={formData.expediente}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="Ej: EXP-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white"
            >
              <option value="Recibido">Recibido</option>
              <option value="En Caja">En Caja</option>
              <option value="Entregado">Entregado</option>
              <option value="Tesoreria">Tesorería</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de registro <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_registro"
                value={formData.fecha_registro}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha en caja {formData.estado === 'En Caja' ? '(Automática, editable)' : ''}
              </label>
              <input
                type="date"
                name="fecha_en_caja"
                value={formData.fecha_en_caja}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900"
              />
              {formData.estado === 'En Caja' && (
                <p className="mt-1 text-sm text-gray-500">
                  La fecha se establece automáticamente cuando el estado es "En Caja", pero puede editarla manualmente
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCerrar}
              className="px-6 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
            >
              <FaSave className="text-sm" />
              <span>{guardando ? 'Guardando...' : (registroEditar ? 'Actualizar' : 'Crear')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioRegistro;

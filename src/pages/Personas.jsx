import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers, FaSearch, FaIdCard, FaFileAlt, FaFolderOpen,
  FaCalendarAlt, FaEye, FaUser, FaEdit, FaTrash, FaPlus
} from 'react-icons/fa';
import { mostrarError, mostrarExito } from '../utils/alertas';

function Personas() {
  const [personas, setPersonas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [personaEditando, setPersonaEditando] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarPersonas();
  }, []);

  const cargarPersonas = async () => {
    try {
      setCargando(true);
      const response = await window.electronAPI?.personas.obtenerConDocumentos();

      if (response?.success) {
        setPersonas(response.personas || []);
      } else {
        console.error('Error cargando personas:', response?.error);
        mostrarError('Error', 'No se pudieron cargar las personas');
        setPersonas([]);
      }
    } catch (error) {
      console.error('Error cargando personas:', error);
      mostrarError('Error de conexión', 'No se pudieron cargar las personas');
      setPersonas([]);
    } finally {
      setCargando(false);
    }
  };

  const buscarPersonas = async (termino) => {
    if (!termino || termino.trim().length === 0) {
      cargarPersonas();
      return;
    }

    try {
      setCargando(true);
      const response = await window.electronAPI?.personas.buscar(termino);

      if (response?.success) {
        setPersonas(response.personas || []);
      } else {
        console.error('Error buscando personas:', response?.error);
        setPersonas([]);
      }
    } catch (error) {
      console.error('Error buscando personas:', error);
      setPersonas([]);
    } finally {
      setCargando(false);
    }
  };

  const handleBusqueda = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    if (valor.trim().length >= 3) {
      buscarPersonas(valor);
    } else if (valor.trim().length === 0) {
      cargarPersonas();
    }
  };

  const eliminarPersona = async (id) => {
    const confirmado = confirm('¿Estás seguro de eliminar esta persona? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    try {
      const response = await window.electronAPI?.personas.eliminar(id);
      if (response?.success) {
        mostrarExito('Persona eliminada correctamente');
        cargarPersonas();
      } else {
        mostrarError('Error', response?.error || 'No se pudo eliminar la persona');
      }
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo eliminar la persona');
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaUsers className="text-blue-600" />
            Gestión de Personas
          </h1>
          <p className="text-gray-600 mt-1">
            Administra la información y documentos de las personas registradas
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <FaPlus />
          Nueva Persona
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Personas</p>
              <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Documentos</p>
              <p className="text-2xl font-bold text-green-600">
                {personas.filter(p => p.total_documentos > 0).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaFolderOpen className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Documentos</p>
              <p className="text-2xl font-bold text-purple-600">
                {personas.reduce((sum, p) => sum + (parseInt(p.total_documentos) || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaFileAlt className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por DNI o nombre... (mínimo 3 caracteres)"
            value={busqueda}
            onChange={handleBusqueda}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lista de personas */}
      {personas.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border text-center">
          <div className="text-gray-400 mb-4">
            <FaUsers className="mx-auto text-4xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay personas registradas
          </h3>
          <p className="text-gray-600">
            Las personas se crearán automáticamente al agregar registros
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DNI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {personas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/persona/${persona.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaIdCard className="text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{persona.dni || 'Sin DNI'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2" />
                        <span className="text-gray-900">{persona.nombre || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {persona.numero || '---'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FaFileAlt className="mr-1" />
                        {persona.total_registros || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        persona.total_documentos > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <FaFolderOpen className="mr-1" />
                        {persona.total_documentos || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/persona/${persona.id}`);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPersonaEditando(persona);
                            setMostrarFormulario(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarPersona(persona.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaUsers className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Acerca de la gestión de personas</p>
            <ul className="space-y-1">
              <li>• Las personas se crean automáticamente al agregar registros</li>
              <li>• Puedes adjuntar documentos (PDF, imágenes, Excel) a cada persona</li>
              <li>• Click en cualquier fila para ver el detalle completo</li>
              <li>• Usa la búsqueda para encontrar personas por DNI o nombre</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Personas;

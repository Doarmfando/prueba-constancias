import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaSearch, FaUser, FaIdCard, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaFileAlt, FaEdit, FaTrash, FaEye, FaInfoCircle } from 'react-icons/fa';
import { MdPersonSearch, MdHistory, MdPlace } from 'react-icons/md';
import { mostrarError, mostrarExito } from '../utils/alertas';

function Informacion() {
  const { dni: dniParam } = useParams();
  const [dni, setDni] = useState(dniParam || '');
  const [persona, setPersona] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [observacionModal, setObservacionModal] = useState(null);

  // Efecto para cargar automaticamente si hay DNI en la URL
  useEffect(() => {
    if (dniParam && dniParam.length >= 8) {
      buscarPersona(dniParam);
    }
  }, [dniParam]);


  const buscarPersona = async (dniBusqueda = dni) => {
    if (!dniBusqueda || dniBusqueda.length < 8) {
      mostrarError('DNI invalido', 'Debe ingresar un DNI de 8 digitos');
      return;
    }

    setCargando(true);
    setBusquedaRealizada(true);

    try {
      const response = await window.electronAPI?.informacion.buscarPersonaPorDni(dniBusqueda);

      if (response?.success) {
        setPersona(response.persona);
        setRegistros(response.registros || []);
        if (response.persona) {
          mostrarExito(`Se encontro informacion para el DNI ${dniBusqueda}`);
        } else {
          mostrarError('No encontrado', 'No se encontro informacion para el DNI ingresado');
        }
      } else {
        mostrarError('Error en la busqueda', response?.error || 'Error de conexion');
        setPersona(null);
        setRegistros([]);
      }
    } catch (error) {
      mostrarError('Error de conexion', 'No se pudo realizar la busqueda');
      setPersona(null);
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      buscarPersona();
    }
  };

  const estadisticas = {
    totalRegistros: registros.length,
    registrosVigentes: registros.filter(r => r.estado === 'Vigente').length,
    registrosProceso: registros.filter(r => r.estado === 'En Proceso').length,
    ultimoRegistro: registros.length > 0 ? registros[registros.length - 1].fecha_emision : null
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Busqueda por DNI</h1>
          <p className="text-gray-600 mt-1">
            Consulta informacion personal y registros asociados a un documento de identidad
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numero de DNI
          </label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyPress={handleKeyPress}
              placeholder="Ingrese DNI (8 digitos)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
              maxLength={8}
            />
          </div>
          <div className="mt-4">
            <button
              onClick={() => buscarPersona()}
              disabled={cargando || dni.length < 8}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {cargando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <MdPersonSearch className="text-lg" />
                  <span>Buscar Informacion</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {busquedaRealizada && !cargando && (
        <>
          {persona ? (
            <div className="space-y-6">
              {/* Informacion Personal */}
              <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <FaUser />
                    <span>Informacion Personal</span>
                  </h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-3">
                      <FaIdCard className="text-blue-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">DNI</p>
                        <p className="font-semibold text-gray-900">{persona.dni}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaUser className="text-green-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Nombres</p>
                        <p className="font-semibold text-gray-900">{persona.nombres}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaUser className="text-green-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Apellidos</p>
                        <p className="font-semibold text-gray-900">{persona.apellidos}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaPhone className="text-orange-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Telefono</p>
                        <p className="font-semibold text-gray-900">{persona.telefono}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaEnvelope className="text-purple-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{persona.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaCalendarAlt className="text-red-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(persona.fecha_nacimiento).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 md:col-span-2">
                      <FaMapMarkerAlt className="text-blue-600 text-lg mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Direccion</p>
                        <p className="font-semibold text-gray-900">{persona.direccion}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <MdPlace className="text-indigo-600 text-lg" />
                      <div>
                        <p className="text-sm text-gray-600">Ocupacion</p>
                        <p className="font-semibold text-gray-900">{persona.ocupacion}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadisticas de Registros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Registros</p>
                      <p className="text-2xl font-bold text-gray-900">{estadisticas.totalRegistros}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FaFileAlt className="text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Vigentes</p>
                      <p className="text-2xl font-bold text-green-600">{estadisticas.registrosVigentes}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <FaEye className="text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">En Proceso</p>
                      <p className="text-2xl font-bold text-orange-600">{estadisticas.registrosProceso}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <MdHistory className="text-orange-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ultimo Registro</p>
                      <p className="text-sm font-bold text-purple-600">
                        {estadisticas.ultimoRegistro ?
                          new Date(estadisticas.ultimoRegistro).toLocaleDateString() :
                          'N/A'
                        }
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <FaCalendarAlt className="text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Registros */}
              {registros.length > 0 ? (
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Registros Asociados ({registros.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expediente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Registro
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha en Caja
                          </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                             Proyecto
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '250px' }}>
                             Observaciones
                           </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {registros.map((registro) => (
                          <tr key={registro.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FaFileAlt className="text-blue-600 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {registro.expediente || registro.codigo || '---'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {registro.fecha_registro ? new Date(registro.fecha_registro).toLocaleDateString() : '---'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                registro.estado === 'Vigente'
                                  ? 'bg-green-100 text-green-800'
                                  : registro.estado === 'En Proceso'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {registro.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {registro.estado === 'Recibido'
                                ? 'No entregado'
                                : registro.estado === 'En Caja'
                                ? (registro.fecha_en_caja ? new Date(registro.fecha_en_caja).toLocaleDateString() : '---')
                                : '---'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {registro.proyecto}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700" style={{ maxWidth: '250px' }}>
                              {registro.observacion ? (
                                <div className="group relative">
                                  <div className="line-clamp-2 overflow-hidden text-ellipsis">
                                    {registro.observacion}
                                  </div>
                                  {registro.observacion.length > 100 && (
                                    <button
                                      onClick={() => setObservacionModal(registro.observacion)}
                                      className="text-blue-600 hover:text-blue-800 text-xs mt-1 flex items-center gap-1"
                                    >
                                      <FaInfoCircle />
                                      Ver completa
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">---</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-lg shadow border text-center">
                  <FaFileAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sin registros asociados
                  </h3>
                  <p className="text-gray-600">
                    Esta persona no tiene registros documentales en el sistema
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow border text-center">
              <MdPersonSearch className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Persona no encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                No se encontro informacion para el DNI <strong>{dni}</strong>
              </p>
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!busquedaRealizada && (
        <div className="bg-white p-12 rounded-lg shadow border text-center">
          <MdPersonSearch className="mx-auto text-6xl text-gray-400 mb-6" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Busqueda de Informacion Personal
          </h3>
          <p className="text-gray-600 mb-6">
            Ingrese un numero de DNI valido para consultar la informacion personal y registros asociados
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center justify-center gap-2">
              <FaInfoCircle /> Informacion
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Ingrese 8 digitos del DNI</li>
              <li>• Presione Enter o haga clic en Buscar</li>
              <li>• Se mostraran datos personales y registros</li>
              <li>• Los datos se consultan en tiempo real desde la base de datos</li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal para ver observacion completa */}
      {observacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FaInfoCircle />
                Observacion Completa
              </h3>
              <button
                onClick={() => setObservacionModal(null)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                {observacionModal}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Informacion;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaIdCard, FaFileAlt, FaFolderOpen,
  FaCalendarAlt, FaDownload, FaTrash, FaPlus, FaEdit,
  FaPaperclip, FaFilePdf, FaFileExcel, FaFileImage, FaFileWord,
  FaFile, FaEye, FaInfoCircle
} from 'react-icons/fa';
import { mostrarConfirmacion, mostrarExito, mostrarError, formatearFecha } from '../utils/alertas';
import { useAuth } from '../context/AuthContext';
import { useRealtimeSync } from '../hooks/useRealtimeData';

function PersonaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [persona, setPersona] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('datos');
  const [mostrarModalDocumento, setMostrarModalDocumento] = useState(false);
  const [comentarioDocumento, setComentarioDocumento] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [observacionModal, setObservacionModal] = useState(null);
  const fileInputRef = useRef(null);
  const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
  const isWebBridge = typeof window !== 'undefined' && window.__WEB_BRIDGE__;

  // Realtime
  useRealtimeSync('documentos_persona', cargarDatos, {
    habilitado: true,
    debounceMs: 500
  });

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // Buscar la persona por ID
      const todasLasPersonas = await window.electronAPI?.personas.obtenerConDocumentos();

      if (todasLasPersonas?.success) {
        const personaEncontrada = todasLasPersonas.personas.find(p => p.id === parseInt(id));

        if (personaEncontrada) {
          setPersona(personaEncontrada);

          // Cargar documentos
          await cargarDocumentos(personaEncontrada.id);

          // Cargar registros usando el DNI
          if (personaEncontrada.dni) {
            const responseInfo = await window.electronAPI?.informacion.buscarPersonaPorDni(personaEncontrada.dni);
            if (responseInfo?.success) {
              setRegistros(responseInfo.registros || []);
            }
          }
        } else {
          mostrarError('Error', 'Persona no encontrada');
          navigate('/personas');
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      mostrarError('Error', 'No se pudieron cargar los datos de la persona');
    } finally {
      setCargando(false);
    }
  };

  const cargarDocumentos = async (personaId) => {
    try {
      let response;
      if (isWebBridge) {
        const res = await fetch(`${API_BASE_URL}/documentos-persona/${personaId}`);
        response = await res.json();
        if (!res.ok) {
          throw new Error(response?.error || 'No se pudieron obtener los documentos');
        }
      } else {
        response = await window.electronAPI?.documentosPersona.obtenerPorPersona(personaId);
      }

      if (response?.success) {
        setDocumentos(response.documentos || []);
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
    }
  };

  const seleccionarArchivoElectron = async () => {
    try {
      const response = await window.electronAPI?.documentosPersona.seleccionarArchivo();

      if (response?.success && !response.cancelled) {
        setArchivoSeleccionado({
          origen: 'electron',
          ruta: response.archivo_origen,
          nombre: response.nombre_archivo
        });
      }
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
      mostrarError('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleSeleccionarArchivo = () => {
    if (isWebBridge) {
      fileInputRef.current?.click();
    } else {
      seleccionarArchivoElectron();
    }
  };

  const handleArchivoInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setArchivoSeleccionado({
        origen: 'web',
        nombre: file.name,
        file
      });
    } else {
      setArchivoSeleccionado(null);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSubirDocumento = async () => {
    if (!archivoSeleccionado) {
      mostrarError('Error', 'Debes seleccionar un archivo');
      return;
    }

    try {
      setSubiendoDocumento(true);

      let response;
      if (isWebBridge) {
        if (!archivoSeleccionado?.file) {
          mostrarError('Error', 'No se pudo acceder al archivo seleccionado');
          return;
        }

        const formData = new FormData();
        formData.append('archivo', archivoSeleccionado.file);
        formData.append('persona_id', persona.id);
        if (comentarioDocumento) formData.append('comentario', comentarioDocumento);
        if (usuario?.id) formData.append('usuario_carga_id', usuario.id);

        const res = await fetch(`${API_BASE_URL}/documentos-persona/subir`, {
          method: 'POST',
          body: formData,
        });
        response = await res.json();
        if (!res.ok) {
          throw new Error(response?.error || 'No se pudo cargar el documento');
        }
      } else {
        response = await window.electronAPI?.documentosPersona.subirDocumento({
          persona_id: persona.id,
          archivo_origen: archivoSeleccionado.ruta,
          nombre_archivo: archivoSeleccionado.nombre,
          comentario: comentarioDocumento,
          usuario: usuario
        });
      }

      if (response?.success) {
        mostrarExito('Documento cargado', 'El documento se ha cargado correctamente');
        setMostrarModalDocumento(false);
        setArchivoSeleccionado(null);
        setComentarioDocumento('');
        await cargarDocumentos(persona.id);
      } else {
        mostrarError('Error', response?.error || 'No se pudo cargar el documento');
      }
    } catch (error) {
      console.error('Error subiendo documento:', error);
      mostrarError('Error', 'No se pudo cargar el documento');
    } finally {
      setSubiendoDocumento(false);
    }
  };

  const handleEliminarDocumento = async (documento) => {
    const confirmado = await mostrarConfirmacion(
      '¿Eliminar documento?',
      `¿Estas seguro de que deseas eliminar "${documento.nombre_archivo}"? Esta accion no se puede deshacer.`
    );

    if (confirmado) {
      try {
        let response;
        if (isWebBridge) {
          const res = await fetch(`${API_BASE_URL}/documentos-persona/${documento.id}`, {
            method: 'DELETE',
          });
          response = await res.json();
          if (!res.ok) {
            throw new Error(response?.error || 'No se pudo eliminar el documento');
          }
        } else {
          response = await window.electronAPI?.documentosPersona.eliminar(documento.id, usuario);
        }

        if (response?.success) {
          mostrarExito('Documento eliminado', 'El documento ha sido eliminado correctamente');
          await cargarDocumentos(persona.id);
        } else {
          mostrarError('Error', response?.error || 'No se pudo eliminar el documento');
        }
      } catch (error) {
        console.error('Error eliminando documento:', error);
        mostrarError('Error', 'No se pudo eliminar el documento');
      }
    }
  };

  const handleAbrirDocumento = async (documento) => {
    try {
      if (isWebBridge) {
        const url = `${API_BASE_URL}/documentos-persona/descargar/${documento.id}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      const response = await window.electronAPI?.documentosPersona.abrir(documento.id);

      if (!response?.success) {
        mostrarError('Error', response?.error || 'No se pudo abrir el documento');
      }
    } catch (error) {
      console.error('Error abriendo documento:', error);
      mostrarError('Error', 'No se pudo abrir el documento');
    }
  };

  const handleDescargarDocumento = async (documento) => {
    try {
      if (isWebBridge) {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/documentos-persona/descargar/${documento.id}`;
        link.download = documento.nombre_archivo || '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarExito('Descarga iniciada', 'Revisa tu carpeta de descargas');
        return;
      }

      const response = await window.electronAPI?.documentosPersona.descargar(documento.id);

      if (response?.success) {
        mostrarExito('Descarga exitosa', 'El documento se ha guardado correctamente');
      } else if (!response?.cancelled) {
        mostrarError('Error', response?.error || 'No se pudo descargar el documento');
      }
    } catch (error) {
      console.error('Error descargando documento:', error);
      mostrarError('Error', 'No se pudo descargar el documento');
    }
  };

  const obtenerIconoDocumento = (tipoArchivo) => {
    switch (tipoArchivo) {
      case 'pdf':
        return <FaFilePdf className="text-red-500 text-2xl" />;
      case 'word':
        return <FaFileWord className="text-blue-600 text-2xl" />;
      case 'excel':
        return <FaFileExcel className="text-green-500 text-2xl" />;
      case 'imagen':
        return <FaFileImage className="text-blue-500 text-2xl" />;
      default:
        return <FaFile className="text-gray-500 text-2xl" />;
    }
  };

  const formatearTamano = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Persona no encontrada</p>
        <button
          onClick={() => navigate('/personas')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Volver a Personas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/personas')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaUser className="text-blue-600" />
              {persona.nombre || 'Sin nombre'}
            </h1>
            <p className="text-gray-600 mt-1">
              DNI: {persona.dni || 'Sin DNI'} {persona.numero ? `| Numero: ${persona.numero}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Estadisticas rapidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-blue-600">{registros.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFileAlt className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Documentos Adjuntos</p>
              <p className="text-2xl font-bold text-green-600">{documentos.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaFolderOpen className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fecha Registro</p>
              <p className="text-sm font-medium text-gray-900">
                {persona.fecha_registro
                  ? formatearFecha(persona.fecha_registro)
                  : 'No disponible'
                }
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaCalendarAlt className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setTabActiva('datos')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                tabActiva === 'datos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUser className="inline mr-2" />
              Datos Personales
            </button>
            <button
              onClick={() => setTabActiva('documentos')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                tabActiva === 'documentos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaFolderOpen className="inline mr-2" />
              Documentos ({documentos.length})
            </button>
            <button
              onClick={() => setTabActiva('registros')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                tabActiva === 'registros'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaFileAlt className="inline mr-2" />
              Registros Asociados ({registros.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Datos Personales */}
          {tabActiva === 'datos' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informacion Personal</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                  <p className="text-gray-900 font-medium mt-1">{persona.nombre || 'No especificado'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">DNI</label>
                  <p className="text-gray-900 font-medium mt-1">{persona.dni || 'No especificado'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">Numero</label>
                  <p className="text-gray-900 font-medium mt-1">{persona.numero || 'No especificado'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                  <p className="text-gray-900 font-medium mt-1">
                    {persona.fecha_registro
                      ? new Date(persona.fecha_registro).toLocaleString()
                      : 'No disponible'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Documentos */}
          {tabActiva === 'documentos' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Documentos Adjuntos</h3>
                <button
                  onClick={() => setMostrarModalDocumento(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaPlus />
                  Cargar Documento
                </button>
              </div>

              {documentos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FaFolderOpen className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600">No hay documentos cargados</p>
                  <button
                    onClick={() => setMostrarModalDocumento(true)}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Cargar el primer documento
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {obtenerIconoDocumento(doc.tipo_archivo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {doc.nombre_archivo}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatearTamano(doc.tamaño_bytes)}
                          </p>
                          {doc.comentario && (
                            <p className="text-sm text-gray-500 mt-2 italic">
                              "{doc.comentario}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <FaCalendarAlt />
                            <span>
                              {new Date(doc.fecha_carga).toLocaleDateString()}
                            </span>
                            {doc.usuario_carga_nombre && (
                              <>
                                <span>•</span>
                                <span>{doc.usuario_carga_nombre}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                          onClick={() => handleAbrirDocumento(doc)}
                          className="bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <FaEye />
                          Abrir
                        </button>
                        <button
                          onClick={() => handleDescargarDocumento(doc)}
                          className="bg-green-50 text-green-600 px-3 py-2 rounded hover:bg-green-100 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <FaDownload />
                          Guardar
                        </button>
                        <button
                          onClick={() => handleEliminarDocumento(doc)}
                          className="bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <FaTrash />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Registros */}
          {tabActiva === 'registros' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Registros Asociados ({registros.length})
              </h3>

              {registros.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FaFileAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600">No hay registros asociados</p>
                </div>
              ) : (
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '250px' }}>
                          Observaciones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proyecto
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
                            {formatearFecha(registro.fecha_registro)}
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
                              ? formatearFecha(registro.fecha_en_caja)
                              : '---'
                            }
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {registro.proyecto}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cargar Documento */}
      {mostrarModalDocumento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Cargar Nuevo Documento
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo
                  </label>
                  {isWebBridge && (
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleArchivoInputChange}
                    />
                  )}
                  <button
                    onClick={handleSeleccionarArchivo}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    {archivoSeleccionado ? (
                      <div className="flex items-center justify-center gap-2">
                        <FaPaperclip className="text-blue-600" />
                        <span className="text-sm text-gray-900 font-medium">
                          {archivoSeleccionado.nombre}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FaPlus className="mx-auto text-2xl text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          Click para seleccionar archivo
                        </span>
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario (opcional)
                  </label>
                  <textarea
                    value={comentarioDocumento}
                    onChange={(e) => setComentarioDocumento(e.target.value)}
                    placeholder="Ej: DNI escaneado, recibo de servicios, etc."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setMostrarModalDocumento(false);
                    setArchivoSeleccionado(null);
                    setComentarioDocumento('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={subiendoDocumento}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubirDocumento}
                  disabled={!archivoSeleccionado || subiendoDocumento}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {subiendoDocumento ? 'Cargando...' : 'Cargar Documento'}
                </button>
              </div>
            </div>
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

export default PersonaDetalle;

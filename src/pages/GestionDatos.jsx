import React, { useState, useEffect } from 'react';
import { FaDownload, FaUpload, FaTrash, FaDatabase, FaFileExcel, FaFileCsv, FaFileAlt, FaUsers, FaFolderOpen, FaCog, FaChartBar, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { MdCloudDownload, MdCloudUpload, MdDeleteSweep, MdBackup, MdSettings, MdStorage } from 'react-icons/md';
import { mostrarConfirmacion, mostrarExito, mostrarError } from '../utils/alertas';

function GestionDatos() {
  const [estadisticas, setEstadisticas] = useState({
    totalRegistros: 0,
    totalUsuarios: 0,
    totalProyectos: 0,
    tamanoBase: '0 MB',
    ultimoBackup: null
  });
  const [operacionEnCurso, setOperacionEnCurso] = useState(null);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      // Simular carga de estadísticas
      setTimeout(() => {
        setEstadisticas({
          totalRegistros: 1245,
          totalUsuarios: 6,
          totalProyectos: 12,
          tamanoBase: '15.2 MB',
          ultimoBackup: '2024-03-25T14:30:00Z'
        });
      }, 500);

      // Código real comentado para cuando esté conectado:
      /*
      const response = await window.electronAPI?.gestionDatos.obtenerEstadisticas();
      if (response.success) {
        setEstadisticas(response.estadisticas);
      }
      */
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const exportarDatos = async (formato) => {
    try {
      setOperacionEnCurso(`export-${formato}`);
      setProgreso(0);

      // Simular proceso de exportación
      const intervalos = [20, 40, 60, 80, 100];
      for (let i = 0; i < intervalos.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgreso(intervalos[i]);
      }

      mostrarExito(`Datos exportados correctamente en formato ${formato.toUpperCase()}`);

      // Código real comentado para cuando esté conectado:
      /*
      const response = await window.electronAPI?.gestionDatos.exportarDatos({
        formato: formato,
        incluirUsuarios: true,
        incluirProyectos: true,
        incluirRegistros: true
      });

      if (response.success) {
        mostrarExito(`Datos exportados a: ${response.archivo}`);
      } else {
        mostrarError('Error en la exportación', response.error);
      }
      */
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo exportar los datos');
    } finally {
      setOperacionEnCurso(null);
      setProgreso(0);
    }
  };

  const importarDatos = async () => {
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Importar datos?',
      texto: 'Esta operación puede sobrescribir datos existentes. ¿Está seguro?',
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        setOperacionEnCurso('import');
        setProgreso(0);

        // Simular proceso de importación
        const intervalos = [15, 35, 55, 75, 95, 100];
        for (let i = 0; i < intervalos.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 600));
          setProgreso(intervalos[i]);
        }

        mostrarExito('Datos importados correctamente');
        cargarEstadisticas();

        // Código real comentado para cuando esté conectado:
        /*
        const response = await window.electronAPI?.gestionDatos.importarDatos();
        if (response.success) {
          mostrarExito(`Importados: ${response.registrosImportados} registros`);
          cargarEstadisticas();
        } else {
          mostrarError('Error en la importación', response.error);
        }
        */
      } catch (error) {
        mostrarError('Error de conexión', 'No se pudo importar los datos');
      } finally {
        setOperacionEnCurso(null);
        setProgreso(0);
      }
    }
  };

  const limpiarDatos = async (tipo) => {
    const confirmado = await mostrarConfirmacion({
      titulo: '¿Limpiar datos?',
      texto: `Se eliminarán todos los datos de ${tipo}. Esta acción NO se puede deshacer.`,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmado) {
      try {
        setOperacionEnCurso(`clean-${tipo}`);
        setProgreso(0);

        // Simular proceso de limpieza
        const intervalos = [25, 50, 75, 100];
        for (let i = 0; i < intervalos.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 400));
          setProgreso(intervalos[i]);
        }

        mostrarExito(`Datos de ${tipo} eliminados correctamente`);
        cargarEstadisticas();

        // Código real comentado para cuando esté conectado:
        /*
        const response = await window.electronAPI?.gestionDatos.limpiarDatos({
          tipo: tipo
        });

        if (response.success) {
          mostrarExito(`${response.registrosEliminados} registros eliminados`);
          cargarEstadisticas();
        } else {
          mostrarError('Error en la limpieza', response.error);
        }
        */
      } catch (error) {
        mostrarError('Error de conexión', 'No se pudo limpiar los datos');
      } finally {
        setOperacionEnCurso(null);
        setProgreso(0);
      }
    }
  };

  const crearBackup = async () => {
    try {
      setOperacionEnCurso('backup');
      setProgreso(0);

      // Simular proceso de backup
      const intervalos = [20, 40, 60, 80, 100];
      for (let i = 0; i < intervalos.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgreso(intervalos[i]);
      }

      mostrarExito('Backup creado correctamente');
      cargarEstadisticas();

      // Código real comentado para cuando esté conectado:
      /*
      const response = await window.electronAPI?.gestionDatos.crearBackup();
      if (response.success) {
        mostrarExito(`Backup creado: ${response.archivo}`);
        cargarEstadisticas();
      } else {
        mostrarError('Error creando backup', response.error);
      }
      */
    } catch (error) {
      mostrarError('Error de conexión', 'No se pudo crear el backup');
    } finally {
      setOperacionEnCurso(null);
      setProgreso(0);
    }
  };

  const operaciones = [
    {
      categoria: 'Exportación de Datos',
      icon: <MdCloudDownload className="text-2xl" />,
      color: 'from-blue-600 to-blue-700',
      acciones: [
        {
          titulo: 'Exportar a Excel',
          descripcion: 'Exporta todos los datos en formato XLSX',
          icon: <FaFileExcel className="text-green-600" />,
          accion: () => exportarDatos('excel'),
          key: 'export-excel'
        },
        {
          titulo: 'Exportar a CSV',
          descripcion: 'Exporta datos en formato CSV compatible',
          icon: <FaFileCsv className="text-blue-600" />,
          accion: () => exportarDatos('csv'),
          key: 'export-csv'
        },
        {
          titulo: 'Exportar a JSON',
          descripcion: 'Exporta datos estructurados en JSON',
          icon: <FaFileAlt className="text-orange-600" />,
          accion: () => exportarDatos('json'),
          key: 'export-json'
        }
      ]
    },
    {
      categoria: 'Importación de Datos',
      icon: <MdCloudUpload className="text-2xl" />,
      color: 'from-green-600 to-green-700',
      acciones: [
        {
          titulo: 'Importar desde archivo',
          descripcion: 'Importa datos desde Excel, CSV o JSON',
          icon: <FaUpload className="text-green-600" />,
          accion: importarDatos,
          key: 'import'
        }
      ]
    },
    {
      categoria: 'Backup y Restauración',
      icon: <MdBackup className="text-2xl" />,
      color: 'from-purple-600 to-purple-700',
      acciones: [
        {
          titulo: 'Crear Backup',
          descripcion: 'Crea una copia de seguridad completa',
          icon: <MdBackup className="text-purple-600" />,
          accion: crearBackup,
          key: 'backup'
        }
      ]
    },
    {
      categoria: 'Limpieza de Datos',
      icon: <MdDeleteSweep className="text-2xl" />,
      color: 'from-red-600 to-red-700',
      acciones: [
        {
          titulo: 'Limpiar Registros',
          descripcion: 'Elimina todos los registros del sistema',
          icon: <FaTrash className="text-red-600" />,
          accion: () => limpiarDatos('registros'),
          key: 'clean-registros'
        },
        {
          titulo: 'Limpiar Papelería',
          descripcion: 'Elimina registros en papelería definitivamente',
          icon: <FaTrash className="text-orange-600" />,
          accion: () => limpiarDatos('papeleria'),
          key: 'clean-papeleria'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Datos</h1>
          <p className="text-gray-600 mt-1">
            Administra, exporta, importa y mantiene los datos del sistema
          </p>
        </div>
      </div>

      {/* Estadísticas de la Base de Datos */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.totalRegistros.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFolderOpen className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.totalUsuarios}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaUsers className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Proyectos</p>
              <p className="text-2xl font-bold text-purple-600">{estadisticas.totalProyectos}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FaChartBar className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tamaño BD</p>
              <p className="text-2xl font-bold text-orange-600">{estadisticas.tamanoBase}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <MdStorage className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Último Backup</p>
              <p className="text-sm font-bold text-indigo-600">
                {estadisticas.ultimoBackup ?
                  new Date(estadisticas.ultimoBackup).toLocaleDateString() :
                  'Nunca'
                }
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <MdBackup className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progreso global */}
      {operacionEnCurso && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Operación en progreso...
            </span>
            <span className="text-sm font-medium text-blue-600">{progreso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Operaciones */}
      <div className="space-y-6">
        {operaciones.map((categoria, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow border overflow-hidden">
            <div className={`bg-gradient-to-r ${categoria.color} px-6 py-4`}>
              <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                {categoria.icon}
                <span>{categoria.categoria}</span>
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoria.acciones.map((accion, accionIdx) => (
                  <div
                    key={accionIdx}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {accion.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {accion.titulo}
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          {accion.descripcion}
                        </p>
                        <button
                          onClick={accion.accion}
                          disabled={operacionEnCurso !== null}
                          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            operacionEnCurso === accion.key
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                              : operacionEnCurso !== null
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : accion.key.includes('clean')
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {operacionEnCurso === accion.key ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>Procesando...</span>
                            </div>
                          ) : (
                            'Ejecutar'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Información y advertencias */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaExclamationTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Advertencias importantes</p>
            <ul className="space-y-1">
              <li>• Las operaciones de limpieza son <strong>irreversibles</strong></li>
              <li>• Siempre cree un backup antes de realizar operaciones destructivas</li>
              <li>• Las importaciones pueden sobrescribir datos existentes</li>
              <li>• Solo los administradores pueden realizar estas operaciones</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Estado del sistema */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaCheck className="text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Estado del sistema</p>
            <ul className="space-y-1">
              <li>• Base de datos funcionando correctamente</li>
              <li>• Todas las operaciones están disponibles</li>
              <li>• Sistema preparado para procesar datos</li>
              <li>• Funciones de backup y restauración activas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionDatos;

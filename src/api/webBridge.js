const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

const isBrowser =
  typeof window !== 'undefined' &&
  !(window.electronAPI && window.electronAPI.auth);

const jsonHeaders = { 'Content-Type': 'application/json' };

const callIPC = async (channel, payload) => {
  const response = await fetch(`${API_BASE_URL}/ipc`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ channel, payload }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Error ejecutando canal ${channel}`);
  }

  return data;
};

const unsupported = (feature) => () => {
  const message = `${feature} no está disponible en el modo web`;
  console.warn(message);
  return Promise.resolve({ success: false, error: message });
};

const noopSuccess = () => Promise.resolve({ success: true });

const openWhatsapp = (numero) => {
  if (!numero) {
    return unsupported('Abrir WhatsApp')();
  }
  try {
    const url = `https://wa.me/${encodeURIComponent(numero)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return Promise.resolve({ success: true });
  } catch (error) {
    console.error('Error abriendo WhatsApp:', error);
    return Promise.resolve({ success: false, error: error.message });
  }
};

const buildWebBridge = () => ({
  auth: {
    login: (nombre_usuario, password) =>
      callIPC('auth-login', { nombre_usuario, password }),
    verificarSesion: (usuarioId) =>
      callIPC('auth-verificar-sesion', { usuarioId }),
    obtenerPerfil: (usuarioId) =>
      callIPC('auth-obtener-perfil', { usuarioId }),
    cambiarPassword: (id, passwordAnterior, passwordNuevo, usuario) =>
      callIPC('auth-cambiar-password', {
        id,
        passwordAnterior,
        passwordNuevo,
        usuario,
      }),
    crearUsuario: (datos, usuario) =>
      callIPC('auth-crear-usuario', { datosUsuario: datos, usuario }),
    listarUsuarios: (usuario) =>
      callIPC('auth-listar-usuarios', { usuario }),
    actualizarUsuario: (id, datos, usuario) =>
      callIPC('auth-actualizar-usuario', { id, datos, usuario }),
    desactivarUsuario: (id, usuario) =>
      callIPC('auth-desactivar-usuario', { id, usuario }),
    obtenerEstadisticas: (usuario) =>
      callIPC('auth-obtener-estadisticas', { usuario }),
  },

  registros: {
    obtener: () => callIPC('obtener-registros'),
    obtenerBorrados: () => callIPC('obtener-registros-borrados'),
    obtenerPorProyecto: (proyectoId) =>
      callIPC('obtener-registros-proyecto', proyectoId),
    agregar: (datos, usuario) =>
      callIPC('agregar-registro', { datos, usuario }),
    actualizar: (datos, usuario) =>
      callIPC('actualizar-registro', { datos, usuario }),
    editar: (datos, usuario) =>
      callIPC('editar-registro', { datos, usuario }),
    moverAPapelera: (id, usuario) =>
      callIPC('mover-a-papelera', { id, usuario }),
    restaurar: (id, usuario) =>
      callIPC('restaurar-registro', { id, usuario }),
    eliminar: (id, usuario) =>
      callIPC('eliminarRegistro', { id, usuario }),
    buscarPorDni: (dni) => callIPC('buscar-por-dni', dni),
    actualizarMultiple: (datos, usuario) =>
      callIPC('actualizarMultiple', { datos, usuario }),
    moverAPapeleraMultiple: (ids, usuario) =>
      callIPC('mover-a-papelera-multiple', { ids, usuario }),
    restaurarMultiple: (ids, usuario) =>
      callIPC('restaurar-registro-multiple', { ids, usuario }),
    eliminarMultiple: (ids, usuario) =>
      callIPC('eliminar-registro-multiple', { ids, usuario }),
  },

  archivos: {
    guardarPdf: unsupported('Guardar PDF en local'),
    exportarRegistros: unsupported('Exportar registros localmente'),
    importarRegistros: unsupported('Importar registros locales'),
  },

  sistema: {
    cerrarApp: noopSuccess,
    abrirWhatsapp: (numero) => openWhatsapp(numero),
    abrirCorreo: unsupported('Abrir el cliente de correo'),
    abrirMenuContextual: noopSuccess,
  },

  dashboard: {
    obtenerEstadisticas: () => callIPC('dashboard-estadisticas'),
    obtenerFechasDisponibles: () => callIPC('fechas-disponibles'),
  },

  proyectos: {
    obtenerMisProyectos: (usuarioId, usuario) =>
      callIPC('proyecto-obtener-mis-proyectos', { usuarioId, usuario }),
    crear: (datos, usuario) =>
      callIPC('proyecto-crear', { datos, usuario: usuario || { id: 1 } }),
    eliminar: (id, usuario) =>
      callIPC('proyecto-eliminar', { id, usuario: usuario || { id: 1 } }),
    hacerPrivado: (id, usuario) =>
      callIPC('proyecto-hacer-privado', { id, usuario: usuario || { id: 1 } }),
    hacerPublico: (id, usuario) =>
      callIPC('proyecto-hacer-publico', { id, usuario: usuario || { id: 1 } }),
    obtenerPublicos: () => callIPC('proyecto-obtener-publicos'),
    obtenerProyectosPublicos: () => callIPC('proyecto-obtener-publicos'),
    obtenerDetalle: (id, usuario) =>
      callIPC('proyecto-obtener-por-id', { id, usuario: usuario || { id: 1 } }),
    obtenerPrivadosOtros: (usuario) =>
      callIPC('proyecto-obtener-privados-otros', { usuario }),
    exportarPDF: (proyectoId, titulo, incluirEliminados, usuario) =>
      callIPC('proyecto-exportar-pdf', {
        proyectoId,
        titulo,
        incluirEliminados,
        usuario,
      }),
  },

  auditoria: {
    obtenerHistorial: (filtros) =>
      callIPC('auditoria-obtener-historial', filtros),
  },

  gestionDatos: {
    obtenerEstadisticas: () => callIPC('obtener-estadisticas-base-datos'),
    exportarDatos: (opciones) => callIPC('exportar-datos', opciones),
    importarDatos: () => callIPC('importar-datos'),
    limpiarDatos: (opciones) => callIPC('limpiar-datos', opciones),
    crearBackup: () => callIPC('crear-backup'),
  },

  informacion: {
    buscarPersonaPorDni: (dni) => callIPC('buscar-persona-por-dni', { dni }),
    actualizarInformacion: (datos) =>
      callIPC('actualizar-informacion', datos),
  },

  personas: {
    obtenerConDocumentos: () => callIPC('personas-obtener-con-documentos'),
    buscar: (termino) => callIPC('personas-buscar', termino),
    crear: (datos) => callIPC('personas-crear', datos),
    actualizar: (datos) => callIPC('personas-actualizar', datos),
    eliminar: (id, usuario) => callIPC('personas-eliminar', { id, usuario }),
  },

  documentosPersona: {
    seleccionarArchivo: unsupported('Selección de archivos'),
    subirDocumento: unsupported('Subir documentos desde el navegador'),
    obtenerPorPersona: (personaId) =>
      callIPC('documento-persona-obtener-por-persona', personaId),
    eliminar: (id, usuario) =>
      callIPC('documento-persona-eliminar', { id, usuario }),
    abrir: unsupported('Abrir documento local'),
    descargar: unsupported('Descargar documento local'),
    actualizarComentario: (id, comentario) =>
      callIPC('documento-persona-actualizar-comentario', { id, comentario }),
    obtenerEstadisticas: () =>
      callIPC('documento-persona-estadisticas', {}),
  },

  storage: {
    sincronizar: unsupported('Sincronizar almacenamiento local'),
    obtenerEstadisticasCola: unsupported('Estadísticas de cola'),
    subirArchivo: unsupported('Subir archivo local'),
    descargarArchivo: unsupported('Descargar archivo local'),
    eliminarArchivo: unsupported('Eliminar archivo local'),
    listarArchivos: unsupported('Listar archivos locales'),
  },
});

if (isBrowser) {
  const bridge = buildWebBridge();
  window.electronAPI = bridge;
  window.__WEB_BRIDGE__ = true;

  if (!window.electron) {
    window.electron = {
      ipcRenderer: {
        on: () => {},
        removeListener: () => {},
        removeAllListeners: () => {},
        send: () => {},
        invoke: (channel, payload) => callIPC(channel, payload),
      },
    };
  }
}

export default window?.electronAPI;

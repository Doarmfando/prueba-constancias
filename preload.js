const { contextBridge, ipcRenderer } = require("electron");

// 📌 Lista de canales permitidos
const allowedChannels = new Set([
  "obtener-registros",
  "obtener-registros-borrados",
  "obtener-registros-proyecto",
  "agregar-registro",
  "actualizar-registro",
  "actualizar-informacion", // ← ✅ AGREGA ESTA LÍNEA
  "editar-registro",
  "mover-a-papelera",
  "restaurar-registro",
  "eliminarRegistro",
  "mover-a-papelera-multiple",
  "mover-a-papelera-dni-completo", // ← ✅ AGREGA ESTA LÍNEA
  "restaurar-registro-multiple",
  "eliminar-registro-multiple",
  "guardar-pdf",
  "abrir-whatsapp",
  "abrir-correo",
  "exportar-registros",
  "importar-registros",
  "vaciar-registros",
  "cerrar-app",
  "buscar-por-dni",
  "abrir-menu-contextual",
  "actualizarMultiple",
  "dashboard-estadisticas",
  "fechas-disponibles",
  "navegar-a-informacion", // ✅ Confirmado
  // Canales de autenticación
  "auth-login",
  "auth-verificar-sesion",
  "auth-obtener-perfil",
  "auth-cambiar-password",
  "auth-crear-usuario",
  "auth-listar-usuarios",
  "auth-actualizar-usuario",
  "auth-desactivar-usuario",
  "auth-obtener-estadisticas",
  // Canales de proyectos
  "proyecto-obtener-mis-proyectos",
  "proyecto-crear",
  "proyecto-eliminar",
  "proyecto-hacer-privado",
  "proyecto-hacer-publico",
  "proyecto-obtener-publicos",
  "proyecto-obtener-detalle",
  "proyecto-obtener-privados-otros",
  "proyecto-exportar-pdf",
  // Canales de auditoría
  "auditoria-obtener-historial",
  // Canales de gestión de datos
  "obtener-estadisticas-base-datos",
  "exportar-datos",
  "importar-datos",
  "limpiar-datos",
  "crear-backup",
  // Canales de información
  "buscar-persona-por-dni",
  "obtener-registros-eliminados",
  // Canales de documentos de persona
  "documento-persona-subir",
  "documento-persona-obtener-por-persona",
  "documento-persona-eliminar",
  "documento-persona-abrir",
  "documento-persona-descargar",
  "documento-persona-actualizar-comentario",
  "documento-persona-estadisticas",
  "documento-persona-seleccionar-archivo",
  // Canales de personas
  "personas-obtener-con-documentos",
  "personas-buscar",
  "personas-crear",
  "personas-actualizar",
  "personas-eliminar"
]);

const isChannelAllowed = (channel) => allowedChannels.has(channel);

contextBridge.exposeInMainWorld("electronAPI", {
  // API de Autenticación
  auth: {
    login: (nombre_usuario, password) => ipcRenderer.invoke("auth-login", { nombre_usuario, password }),
    verificarSesion: (usuarioId) => ipcRenderer.invoke("auth-verificar-sesion", { usuarioId }),
    obtenerPerfil: (usuarioId) => ipcRenderer.invoke("auth-obtener-perfil", { usuarioId }),
    cambiarPassword: (id, passwordAnterior, passwordNuevo) => ipcRenderer.invoke("auth-cambiar-password", { id, passwordAnterior, passwordNuevo }),
    crearUsuario: (datos, usuario) => ipcRenderer.invoke("auth-crear-usuario", { datosUsuario: datos, usuario }),
    listarUsuarios: (usuario) => ipcRenderer.invoke("auth-listar-usuarios", { usuario }),
    actualizarUsuario: (id, datos, usuario) => ipcRenderer.invoke("auth-actualizar-usuario", { id, datos, usuario }),
    desactivarUsuario: (id, usuario) => ipcRenderer.invoke("auth-desactivar-usuario", { id, usuario }),
    obtenerEstadisticas: (usuario) => ipcRenderer.invoke("auth-obtener-estadisticas", { usuario })
  },

  // API de Registros
  registros: {
    obtener: () => ipcRenderer.invoke("obtener-registros"),
    obtenerBorrados: () => ipcRenderer.invoke("obtener-registros-borrados"),
    obtenerPorProyecto: (proyectoId) => ipcRenderer.invoke("obtener-registros-proyecto", proyectoId),
    agregar: (datos) => ipcRenderer.invoke("agregar-registro", datos),
    actualizar: (datos) => ipcRenderer.invoke("actualizar-registro", datos),
    editar: (datos) => ipcRenderer.invoke("editar-registro", datos),
    moverAPapelera: (id) => ipcRenderer.invoke("mover-a-papelera", id),
    restaurar: (id) => ipcRenderer.invoke("restaurar-registro", id),
    eliminar: (id) => ipcRenderer.invoke("eliminarRegistro", id),
    buscarPorDni: (dni) => ipcRenderer.invoke("buscar-por-dni", dni),
    actualizarMultiple: (datos) => ipcRenderer.invoke("actualizarMultiple", datos),
    moverAPapeleraMultiple: (ids) => ipcRenderer.invoke("mover-a-papelera-multiple", ids),
    restaurarMultiple: (ids) => ipcRenderer.invoke("restaurar-registro-multiple", ids),
    eliminarMultiple: (ids) => ipcRenderer.invoke("eliminar-registro-multiple", ids),
    // vaciar: () => ipcRenderer.invoke("vaciar-registros") // DESHABILITADO
  },

  // API de Archivos y Exportación
  archivos: {
    guardarPdf: (datos) => ipcRenderer.invoke("guardar-pdf", datos),
    exportarRegistros: (datos) => ipcRenderer.invoke("exportar-registros", datos),
    importarRegistros: () => ipcRenderer.invoke("importar-registros")
  },

  // API de Sistema
  sistema: {
    cerrarApp: () => ipcRenderer.invoke("cerrar-app"),
    abrirWhatsapp: (numero) => ipcRenderer.invoke("abrir-whatsapp", numero),
    abrirCorreo: () => ipcRenderer.invoke("abrir-correo"),
    abrirMenuContextual: (datos) => ipcRenderer.invoke("abrir-menu-contextual", datos)
  },

  // API de Dashboard
  dashboard: {
    obtenerEstadisticas: () => ipcRenderer.invoke("dashboard-estadisticas"),
    obtenerFechasDisponibles: () => ipcRenderer.invoke("fechas-disponibles")
  },

  // API de Proyectos
  proyectos: {
    obtenerMisProyectos: (usuarioId, usuario) => ipcRenderer.invoke("proyecto-obtener-mis-proyectos", { usuarioId, usuario }),
    crear: (datos, usuario) => ipcRenderer.invoke("proyecto-crear", { datos, usuario: usuario || { id: 1 } }),
    eliminar: (id, usuario) => ipcRenderer.invoke("proyecto-eliminar", { id, usuario: usuario || { id: 1 } }),
    hacerPrivado: (id, usuario) => ipcRenderer.invoke("proyecto-hacer-privado", { id, usuario: usuario || { id: 1 } }),
    hacerPublico: (id, usuario) => ipcRenderer.invoke("proyecto-hacer-publico", { id, usuario: usuario || { id: 1 } }),
    obtenerPublicos: () => ipcRenderer.invoke("proyecto-obtener-publicos"),
    obtenerProyectosPublicos: () => ipcRenderer.invoke("proyecto-obtener-publicos"),
    obtenerDetalle: (id, usuario) => ipcRenderer.invoke("proyecto-obtener-por-id", { id, usuario: usuario || { id: 1 } }),
    obtenerPrivadosOtros: (usuario) => ipcRenderer.invoke("proyecto-obtener-privados-otros", { usuario }),
    exportarPDF: (proyectoId, titulo, incluirEliminados, usuario) => ipcRenderer.invoke("proyecto-exportar-pdf", { proyectoId, titulo, incluirEliminados, usuario })
  },

  // API de Auditoría
  auditoria: {
    obtenerHistorial: (filtros) => ipcRenderer.invoke("auditoria-obtener-historial", filtros)
  },

  // API de Gestión de Datos
  gestionDatos: {
    obtenerEstadisticas: () => ipcRenderer.invoke("obtener-estadisticas-base-datos"),
    exportarDatos: (opciones) => ipcRenderer.invoke("exportar-datos", opciones),
    importarDatos: () => ipcRenderer.invoke("importar-datos"),
    limpiarDatos: (opciones) => ipcRenderer.invoke("limpiar-datos", opciones),
    crearBackup: () => ipcRenderer.invoke("crear-backup")
  },

  // API de Información/Búsqueda
  informacion: {
    buscarPersonaPorDni: (dni) => ipcRenderer.invoke("buscar-persona-por-dni", { dni }),
    actualizarInformacion: (datos) => ipcRenderer.invoke("actualizar-informacion", datos)
  },

  // API de Personas
  personas: {
    obtenerConDocumentos: () => ipcRenderer.invoke("personas-obtener-con-documentos"),
    buscar: (termino) => ipcRenderer.invoke("personas-buscar", termino),
    crear: (datos) => ipcRenderer.invoke("personas-crear", datos),
    actualizar: (datos) => ipcRenderer.invoke("personas-actualizar", datos),
    eliminar: (id) => ipcRenderer.invoke("personas-eliminar", id)
  },

  // API de Documentos de Persona
  documentosPersona: {
    seleccionarArchivo: () => ipcRenderer.invoke("documento-persona-seleccionar-archivo"),
    subirDocumento: (datos) => ipcRenderer.invoke("documento-persona-subir", datos),
    obtenerPorPersona: (persona_id) => ipcRenderer.invoke("documento-persona-obtener-por-persona", persona_id),
    eliminar: (id, usuario) => ipcRenderer.invoke("documento-persona-eliminar", { id, usuario }),
    abrir: (id) => ipcRenderer.invoke("documento-persona-abrir", { id }),
    descargar: (id) => ipcRenderer.invoke("documento-persona-descargar", { id }),
    actualizarComentario: (id, comentario) => ipcRenderer.invoke("documento-persona-actualizar-comentario", { id, comentario }),
    obtenerEstadisticas: () => ipcRenderer.invoke("documento-persona-estadisticas")
  }
});

// Mantener compatibilidad con el API anterior
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => {
      if (!isChannelAllowed(channel)) {
        console.warn(`🚨 Canal no permitido: ${channel}`);
        return;
      }
      ipcRenderer.send(channel, data);
    },

    invoke: async (channel, data) => {
      if (!isChannelAllowed(channel)) {
        console.warn(`🚨 Canal no permitido: ${channel}`);
        return;
      }
      try {
        return await ipcRenderer.invoke(channel, data);
      } catch (error) {
        console.error(`❌ Error en invoke(${channel}):`, error);
        throw error;
      }
    },

    on: (channel, callback) => {
      if (!isChannelAllowed(channel)) {
        console.warn(`🚨 Canal no permitido: ${channel}`);
        return;
      }
      const listener = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },

    removeListener: (channel, callback) => {
      if (!isChannelAllowed(channel)) {
        console.warn(`🚨 Canal no permitido: ${channel}`);
        return;
      }
      ipcRenderer.removeListener(channel, callback);
    },

    removeAllListeners: (channel) => {
      if (!isChannelAllowed(channel)) {
        console.warn(`🚨 Canal no permitido: ${channel}`);
        return;
      }
      ipcRenderer.removeAllListeners(channel);
    },
  },
});

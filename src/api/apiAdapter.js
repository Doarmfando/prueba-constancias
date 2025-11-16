// src/api/apiAdapter.js - Adaptador para funcionar en modo web y Electron

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// Detectar si estamos en modo Electron o Web
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// =====================
// HELPER para llamadas HTTP
// =====================
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en fetchAPI:', error);
    throw error;
  }
};

// =====================
// API ADAPTER
// =====================

export const apiAdapter = {
  // Modo actual
  getMode: () => isElectron() ? 'electron' : 'web',

  // PERSONAS
  personas: {
    listar: async () => {
      if (isElectron()) {
        return await window.electronAPI.personas.listar();
      } else {
        return await fetchAPI('/personas');
      }
    },

    buscarPorId: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.personas.buscarPorId(id);
      } else {
        return await fetchAPI(`/personas/${id}`);
      }
    },

    crear: async (datos) => {
      if (isElectron()) {
        return await window.electronAPI.personas.crear(datos);
      } else {
        return await fetchAPI('/personas', {
          method: 'POST',
          body: JSON.stringify(datos),
        });
      }
    },

    actualizar: async (id, datos) => {
      if (isElectron()) {
        return await window.electronAPI.personas.actualizar({ id, ...datos });
      } else {
        return await fetchAPI(`/personas/${id}`, {
          method: 'PUT',
          body: JSON.stringify(datos),
        });
      }
    },

    eliminar: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.personas.eliminar(id);
      } else {
        return await fetchAPI(`/personas/${id}`, {
          method: 'DELETE',
        });
      }
    },

    buscar: async (termino) => {
      if (isElectron()) {
        return await window.electronAPI.personas.buscar(termino);
      } else {
        return await fetchAPI(`/personas?search=${encodeURIComponent(termino)}`);
      }
    },
  },

  // CONSTANCIAS
  constancias: {
    listar: async () => {
      if (isElectron()) {
        return await window.electronAPI.constancias.listar();
      } else {
        return await fetchAPI('/constancias');
      }
    },

    buscarPorId: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.buscarPorId(id);
      } else {
        return await fetchAPI(`/constancias/${id}`);
      }
    },

    crear: async (datos) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.crear(datos);
      } else {
        return await fetchAPI('/constancias', {
          method: 'POST',
          body: JSON.stringify(datos),
        });
      }
    },

    actualizar: async (id, datos) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.actualizar({ id, ...datos });
      } else {
        return await fetchAPI(`/constancias/${id}`, {
          method: 'PUT',
          body: JSON.stringify(datos),
        });
      }
    },

    eliminar: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.eliminar(id);
      } else {
        return await fetchAPI(`/constancias/${id}`, {
          method: 'DELETE',
        });
      }
    },

    generarReporteExcel: async (filtros) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.generarReporteExcel(filtros);
      } else {
        return await fetchAPI('/reportes/excel', {
          method: 'POST',
          body: JSON.stringify(filtros),
        });
      }
    },

    generarReportePDF: async (filtros) => {
      if (isElectron()) {
        return await window.electronAPI.constancias.generarReportePDF(filtros);
      } else {
        return await fetchAPI('/reportes/pdf', {
          method: 'POST',
          body: JSON.stringify(filtros),
        });
      }
    },
  },

  // USUARIOS
  usuarios: {
    login: async (credenciales) => {
      if (isElectron()) {
        return await window.electronAPI.usuarios.login(credenciales);
      } else {
        return await fetchAPI('/usuarios/login', {
          method: 'POST',
          body: JSON.stringify(credenciales),
        });
      }
    },

    listar: async () => {
      if (isElectron()) {
        return await window.electronAPI.usuarios.listar();
      } else {
        return await fetchAPI('/usuarios');
      }
    },

    crear: async (datos) => {
      if (isElectron()) {
        return await window.electronAPI.usuarios.crear(datos);
      } else {
        return await fetchAPI('/usuarios', {
          method: 'POST',
          body: JSON.stringify(datos),
        });
      }
    },
  },

  // TIPOS DE CONSTANCIA
  tiposConstancia: {
    listar: async () => {
      if (isElectron()) {
        return await window.electronAPI.tiposConstancia.listar();
      } else {
        return await fetchAPI('/tipos-constancia');
      }
    },
  },

  // DOCUMENTOS PERSONA
  documentosPersona: {
    obtenerDocumentos: async (persona_id) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.obtenerDocumentos(persona_id);
      } else {
        return await fetchAPI(`/documentos-persona/${persona_id}`);
      }
    },

    subirDocumento: async (datos) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.subirDocumento(datos);
      } else {
        // En modo web, usar FormData
        const formData = new FormData();
        formData.append('archivo', datos.archivo); // El archivo viene del input file
        formData.append('persona_id', datos.persona_id);
        if (datos.comentario) formData.append('comentario', datos.comentario);
        if (datos.usuario_carga_id) formData.append('usuario_carga_id', datos.usuario_carga_id);

        const response = await fetch(`${API_BASE_URL}/documentos-persona/subir`, {
          method: 'POST',
          body: formData,
          // NO incluir Content-Type, el navegador lo establece automáticamente con boundary
        });

        return await response.json();
      }
    },

    abrirDocumento: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.abrirDocumento(id);
      } else {
        // En modo web, descargar y abrir en nueva pestaña
        window.open(`${API_BASE_URL}/documentos-persona/descargar/${id}`, '_blank');
        return { success: true, message: 'Abriendo documento...' };
      }
    },

    descargarDocumento: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.descargarDocumento(id);
      } else {
        // En modo web, usar el endpoint de descarga
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/documentos-persona/descargar/${id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, message: 'Descargando documento...' };
      }
    },

    eliminarDocumento: async (id) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.eliminarDocumento(id);
      } else {
        return await fetchAPI(`/documentos-persona/${id}`, {
          method: 'DELETE',
        });
      }
    },

    actualizarComentario: async (datos) => {
      if (isElectron()) {
        return await window.electronAPI.documentosPersona.actualizarComentario(datos);
      } else {
        return await fetchAPI(`/documentos-persona/${datos.id}/comentario`, {
          method: 'PUT',
          body: JSON.stringify({ comentario: datos.comentario }),
        });
      }
    },
  },

  // HEALTH CHECK
  healthCheck: async () => {
    if (isElectron()) {
      return { status: 'ok', mode: 'electron' };
    } else {
      return await fetchAPI('/health');
    }
  },
};

export default apiAdapter;

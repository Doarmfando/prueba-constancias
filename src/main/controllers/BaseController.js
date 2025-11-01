// src/main/controllers/BaseController.js
class BaseController {
  constructor(model) {
    this.model = model;
  }

  // Manejo consistente de errores
  handleError(error, defaultMessage = "Error en operación") {
    console.error(`${defaultMessage}:`, error);
    
    // Si es un string, es un error controlado del modelo
    if (typeof error === 'string') {
      throw new Error(error);
    }
    
    // Si es un objeto error con message
    if (error?.message) {
      throw new Error(error.message);
    }
    
    // Error genérico
    throw new Error(defaultMessage);
  }

  // Validar que existan los parámetros requeridos
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
  }

  // Sanitizar entrada de datos
  sanitizeInput(data) {
    if (typeof data === 'string') {
      return data.trim();
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          sanitized[key] = value.trim();
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // Formato de respuesta exitosa
  successResponse(data, message = null) {
    const response = { success: true };
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    return response;
  }

  // Formato de respuesta de error
  errorResponse(error, code = null) {
    const response = {
      success: false,
      error: error.message || error
    };
    if (code) response.code = code;
    return response;
  }

  // Verificar si el usuario es administrador
  verificarEsAdmin(usuario) {
    return usuario && usuario.rol === 'administrador';
  }

  // Verificar si el usuario está autenticado
  verificarAutenticado(usuario) {
    return usuario && usuario.id;
  }

  // Verificar si el usuario es el propietario del recurso
  verificarEsPropietario(usuario, recursoUsuarioId) {
    return usuario && usuario.id === recursoUsuarioId;
  }

  // Verificar si el usuario puede editar (es admin o propietario)
  verificarPuedeEditar(usuario, recursoUsuarioId) {
    return this.verificarEsAdmin(usuario) || this.verificarEsPropietario(usuario, recursoUsuarioId);
  }
}

module.exports = BaseController;
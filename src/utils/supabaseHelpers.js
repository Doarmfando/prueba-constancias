// src/utils/supabaseHelpers.js
// Utilidades y helpers para trabajar con Supabase

/**
 * Maneja errores de Supabase de forma consistente
 * @param {Object} error - Error de Supabase
 * @param {string} contexto - Contexto donde ocurrió el error
 * @returns {Object} Objeto con información del error
 */
function manejarError(error, contexto = '') {
  if (!error) return null;

  const errorInfo = {
    success: false,
    mensaje: error.message || 'Error desconocido',
    codigo: error.code,
    detalles: error.details || error.hint,
    contexto
  };

  console.error(`❌ Error en ${contexto}:`, {
    mensaje: errorInfo.mensaje,
    codigo: errorInfo.codigo,
    detalles: errorInfo.detalles
  });

  return errorInfo;
}

/**
 * Construye un objeto de respuesta exitosa
 * @param {*} data - Datos a retornar
 * @param {string} mensaje - Mensaje opcional
 * @returns {Object}
 */
function respuestaExitosa(data, mensaje = '') {
  return {
    success: true,
    data,
    mensaje
  };
}

/**
 * Construye un objeto de respuesta de error
 * @param {string} mensaje - Mensaje de error
 * @param {Object} detalles - Detalles adicionales
 * @returns {Object}
 */
function respuestaError(mensaje, detalles = null) {
  return {
    success: false,
    mensaje,
    detalles
  };
}

/**
 * Construye filtros para queries de Supabase
 * @param {Object} filtros - Objeto con filtros {campo: valor}
 * @param {Object} query - Query de Supabase
 * @returns {Object} Query con filtros aplicados
 */
function aplicarFiltros(query, filtros = {}) {
  let queryConFiltros = query;

  Object.entries(filtros).forEach(([campo, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      queryConFiltros = queryConFiltros.eq(campo, valor);
    }
  });

  return queryConFiltros;
}

/**
 * Construye ordenamiento para queries
 * @param {Object} query - Query de Supabase
 * @param {string} campo - Campo por el cual ordenar
 * @param {boolean} ascendente - Si es ascendente o descendente
 * @returns {Object} Query con ordenamiento
 */
function aplicarOrdenamiento(query, campo = 'id', ascendente = true) {
  return query.order(campo, { ascending: ascendente });
}

/**
 * Construye paginación para queries
 * @param {Object} query - Query de Supabase
 * @param {number} pagina - Número de página (1-indexed)
 * @param {number} limite - Cantidad de registros por página
 * @returns {Object} Query con paginación
 */
function aplicarPaginacion(query, pagina = 1, limite = 10) {
  const desde = (pagina - 1) * limite;
  const hasta = desde + limite - 1;
  return query.range(desde, hasta);
}

/**
 * Construye búsqueda por texto
 * @param {Object} query - Query de Supabase
 * @param {string} campo - Campo donde buscar
 * @param {string} termino - Término de búsqueda
 * @returns {Object} Query con búsqueda
 */
function aplicarBusqueda(query, campo, termino) {
  if (!termino || termino.trim() === '') return query;
  return query.ilike(campo, `%${termino}%`);
}

/**
 * Adapta fechas de SQLite a PostgreSQL
 * @param {string} fecha - Fecha en formato SQLite
 * @returns {string} Fecha en formato PostgreSQL
 */
function adaptarFecha(fecha) {
  if (!fecha) return null;

  // Si ya es un timestamp válido, retornarlo
  if (fecha instanceof Date) {
    return fecha.toISOString();
  }

  // Convertir string a Date y luego a ISO
  try {
    return new Date(fecha).toISOString();
  } catch (error) {
    console.warn('⚠️ Error adaptando fecha:', fecha);
    return null;
  }
}

/**
 * Adapta booleanos de SQLite (0/1) a PostgreSQL (true/false)
 * @param {number|boolean} valor - Valor SQLite
 * @returns {boolean}
 */
function adaptarBooleano(valor) {
  if (typeof valor === 'boolean') return valor;
  return valor === 1 || valor === true || valor === '1';
}

/**
 * Construye objeto de paginación para respuesta
 * @param {number} total - Total de registros
 * @param {number} pagina - Página actual
 * @param {number} limite - Límite por página
 * @returns {Object}
 */
function construirPaginacion(total, pagina, limite) {
  return {
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
    tieneSiguiente: pagina * limite < total,
    tieneAnterior: pagina > 1
  };
}

/**
 * Valida que exista una conexión a Supabase
 * @param {Object} supabase - Cliente de Supabase
 * @returns {boolean}
 */
function validarConexion(supabase) {
  if (!supabase) {
    console.error('❌ No hay conexión a Supabase');
    return false;
  }
  return true;
}

/**
 * Retry helper para operaciones que pueden fallar
 * @param {Function} operacion - Función async a ejecutar
 * @param {number} intentos - Número de intentos
 * @param {number} delay - Delay entre intentos en ms
 * @returns {Promise}
 */
async function reintentarOperacion(operacion, intentos = 3, delay = 1000) {
  for (let i = 0; i < intentos; i++) {
    try {
      return await operacion();
    } catch (error) {
      if (i === intentos - 1) throw error;
      console.warn(`⚠️ Intento ${i + 1} falló, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Formatea errores de PostgreSQL para mostrarlos al usuario
 * @param {Object} error - Error de Supabase
 * @returns {string}
 */
function formatearErrorUsuario(error) {
  if (!error) return 'Error desconocido';

  const erroresComunesPostgres = {
    '23505': 'Ya existe un registro con esos datos',
    '23503': 'No se puede eliminar porque está relacionado con otros registros',
    '23502': 'Falta información requerida',
    '42P01': 'La tabla no existe',
    'PGRST116': 'No se encontró el registro',
    '22P02': 'Formato de dato inválido'
  };

  return erroresComunesPostgres[error.code] || error.message || 'Error en la operación';
}

module.exports = {
  manejarError,
  respuestaExitosa,
  respuestaError,
  aplicarFiltros,
  aplicarOrdenamiento,
  aplicarPaginacion,
  aplicarBusqueda,
  adaptarFecha,
  adaptarBooleano,
  construirPaginacion,
  validarConexion,
  reintentarOperacion,
  formatearErrorUsuario
};

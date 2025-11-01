const BaseModel = require('./BaseModel');

class AuditoriaModel extends BaseModel {
  constructor(db) {
    super(db);
  }

  // Registrar una acción en la auditoría
  async registrarAccion(datos) {
    const {
      usuario_id,
      accion,
      tabla_afectada,
      registro_id = null,
      proyecto_id = null,
      detalles = null
    } = datos;

    const sql = `
      INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, proyecto_id, detalles)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await this.executeRun(sql, [
        usuario_id,
        accion,
        tabla_afectada,
        registro_id,
        proyecto_id,
        typeof detalles === 'object' ? JSON.stringify(detalles) : detalles
      ]);
      return result.lastID;
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzar error para no afectar el flujo principal
      return null;
    }
  }

  // Obtener historial con filtros
  async obtenerHistorial({ limite = 100, offset = 0, busqueda = null, usuario = null, accion = null }) {
    let whereClause = '';
    let params = [];

    const conditions = [];

    if (busqueda) {
      conditions.push('(a.accion LIKE ? OR a.tabla_afectada LIKE ? OR u.nombre_usuario LIKE ? OR a.detalles LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (usuario) {
      conditions.push('u.nombre_usuario = ?');
      params.push(usuario);
    }

    if (accion) {
      conditions.push('a.accion = ?');
      params.push(accion);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const sql = `
      SELECT a.*, u.nombre_usuario as nombre_usuario,
        p.nombre as nombre_proyecto
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      ${whereClause}
      ORDER BY a.fecha DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limite, offset);
    return await this.executeQuery(sql, params);
  }

  // Contar total con filtros
  async contarTotal({ busqueda = null, usuario = null, accion = null }) {
    let whereClause = '';
    let params = [];

    const conditions = [];

    if (busqueda) {
      conditions.push('(a.accion LIKE ? OR a.tabla_afectada LIKE ? OR u.nombre_usuario LIKE ? OR a.detalles LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (usuario) {
      conditions.push('u.nombre_usuario = ?');
      params.push(usuario);
    }

    if (accion) {
      conditions.push('a.accion = ?');
      params.push(accion);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const sql = `
      SELECT COUNT(*) as total
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      ${whereClause}
    `;

    const result = await this.executeGet(sql, params);
    return result ? result.total : 0;
  }

  // Obtener historial completo (solo admin)
  async obtenerHistorialCompleto(filtros = {}) {
    const { busqueda, usuario, accion } = filtros;
    let whereClause = '';
    let params = [];

    const conditions = [];

    if (busqueda) {
      conditions.push('(a.accion LIKE ? OR a.tabla_afectada LIKE ? OR u.nombre_usuario LIKE ? OR a.detalles LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (usuario) {
      conditions.push('u.nombre_usuario = ?');
      params.push(usuario);
    }

    if (accion) {
      conditions.push('a.accion = ?');
      params.push(accion);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const sql = `
      SELECT a.*, u.nombre_usuario as nombre_usuario,
        p.nombre as nombre_proyecto
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      ${whereClause}
      ORDER BY a.fecha DESC
      LIMIT 10000
    `;

    return await this.executeQuery(sql, params);
  }

  // Obtener estadísticas
  async obtenerEstadisticas() {
    const sql = `
      SELECT
        COUNT(*) as total_acciones,
        COUNT(DISTINCT a.usuario_id) as usuarios_activos,
        COUNT(DISTINCT a.proyecto_id) as proyectos_afectados,
        SUM(CASE WHEN a.accion = 'crear' THEN 1 ELSE 0 END) as creaciones,
        SUM(CASE WHEN a.accion = 'editar' THEN 1 ELSE 0 END) as ediciones,
        SUM(CASE WHEN a.accion = 'eliminar' THEN 1 ELSE 0 END) as eliminaciones,
        SUM(CASE WHEN a.accion = 'publicar' THEN 1 ELSE 0 END) as publicaciones,
        SUM(CASE WHEN a.accion = 'acceso' THEN 1 ELSE 0 END) as accesos
      FROM auditoria a
    `;

    return await this.executeGet(sql);
  }

  // Limpiar historial antiguo
  async limpiarHistorialAntiguo(diasAntiguedad = 365) {
    try {
      const sql = `
        DELETE FROM auditoria
        WHERE fecha < datetime('now', '-${diasAntiguedad} days')
      `;

      const result = await this.executeRun(sql);

      return {
        success: true,
        registrosEliminados: result.changes,
        message: `Se eliminaron ${result.changes} registros anteriores a ${diasAntiguedad} días`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener historial por usuario
  async obtenerHistorialPorUsuario(usuarioId, limite = 50, offset = 0) {
    const sql = `
      SELECT a.*, u.nombre_usuario as nombre_usuario,
        p.nombre as nombre_proyecto
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      WHERE a.usuario_id = ?
      ORDER BY a.fecha DESC
      LIMIT ? OFFSET ?
    `;
    return await this.executeQuery(sql, [usuarioId, limite, offset]);
  }

  // Obtener historial por proyecto
  async obtenerHistorialPorProyecto(proyectoId, limite = 50, offset = 0) {
    const sql = `
      SELECT a.*, u.nombre_usuario as nombre_usuario, u.email
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.proyecto_id = ?
      ORDER BY a.fecha DESC
      LIMIT ? OFFSET ?
    `;
    return await this.executeQuery(sql, [proyectoId, limite, offset]);
  }

  // Obtener estadísticas de actividad
  async obtenerEstadisticasActividad(fechaInicio = null, fechaFin = null) {
    let whereClause = '';
    let params = [];

    if (fechaInicio && fechaFin) {
      whereClause = 'WHERE a.fecha BETWEEN ? AND ?';
      params = [fechaInicio, fechaFin];
    }

    const sql = `
      SELECT
        COUNT(*) as total_acciones,
        COUNT(DISTINCT a.usuario_id) as usuarios_activos,
        COUNT(DISTINCT a.proyecto_id) as proyectos_afectados,
        SUM(CASE WHEN a.accion = 'crear' THEN 1 ELSE 0 END) as creaciones,
        SUM(CASE WHEN a.accion = 'editar' THEN 1 ELSE 0 END) as ediciones,
        SUM(CASE WHEN a.accion = 'eliminar' THEN 1 ELSE 0 END) as eliminaciones,
        SUM(CASE WHEN a.accion = 'publicar' THEN 1 ELSE 0 END) as publicaciones
      FROM auditoria a
      ${whereClause}
    `;

    return await this.executeGet(sql, params);
  }

  // Obtener actividad reciente por usuario
  async obtenerActividadReciente(usuarioId, limite = 10) {
    const sql = `
      SELECT a.accion, a.tabla_afectada, a.fecha,
        p.nombre as nombre_proyecto
      FROM auditoria a
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      WHERE a.usuario_id = ?
      ORDER BY a.fecha DESC
      LIMIT ?
    `;
    return await this.executeQuery(sql, [usuarioId, limite]);
  }

  // Buscar en auditoría
  async buscar(termino, usuarioId = null, proyectoId = null) {
    let whereClause = 'WHERE (a.accion LIKE ? OR a.tabla_afectada LIKE ? OR a.detalles LIKE ?)';
    let params = [`%${termino}%`, `%${termino}%`, `%${termino}%`];

    if (usuarioId) {
      whereClause += ' AND a.usuario_id = ?';
      params.push(usuarioId);
    }

    if (proyectoId) {
      whereClause += ' AND a.proyecto_id = ?';
      params.push(proyectoId);
    }

    const sql = `
      SELECT a.*, u.nombre_usuario as nombre_usuario,
        p.nombre as nombre_proyecto
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN proyectos_registros p ON a.proyecto_id = p.id
      ${whereClause}
      ORDER BY a.fecha DESC
      LIMIT 100
    `;

    return await this.executeQuery(sql, params);
  }

  // Limpiar auditoría antigua (mantener solo últimos N días)
  async limpiarAuditoria(diasAMantener = 90) {
    const sql = `
      DELETE FROM auditoria
      WHERE fecha < datetime('now', '-${diasAMantener} days')
    `;

    const result = await this.executeRun(sql);
    return result.changes;
  }

  // Métodos de conveniencia para acciones comunes
  async registrarCreacion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return await this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'crear',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles: detalles
    });
  }

  async registrarEdicion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return await this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'editar',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles: detalles
    });
  }

  async registrarEliminacion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return await this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'eliminar',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles: detalles
    });
  }

  async registrarPublicacion(usuarioId, proyectoId, detalles = null) {
    return await this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'publicar',
      tabla_afectada: 'proyectos_registros',
      registro_id: proyectoId,
      proyecto_id: proyectoId,
      detalles: detalles
    });
  }

  async registrarAcceso(usuarioId, proyectoId = null) {
    return await this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'acceso',
      tabla_afectada: 'sistema',
      proyecto_id: proyectoId
    });
  }
}

module.exports = AuditoriaModel;
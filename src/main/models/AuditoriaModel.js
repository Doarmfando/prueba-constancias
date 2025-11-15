const BaseModel = require('./BaseModel');

class AuditoriaModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'auditoria');
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

    try {
      const auditoria = await this.create({
        usuario_id,
        accion,
        tabla_afectada,
        registro_id,
        proyecto_id,
        detalles: typeof detalles === 'object' ? JSON.stringify(detalles) : detalles
      });
      return auditoria.id;
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      return null;
    }
  }

  // Métodos auxiliares específicos para acciones comunes

  // Registrar acceso/login de usuario
  async registrarAcceso(usuarioId) {
    return this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'login',
      tabla_afectada: 'usuarios',
      registro_id: usuarioId,
      detalles: { fecha_acceso: new Date().toISOString() }
    });
  }

  // Registrar creación de un registro
  async registrarCreacion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'crear',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles
    });
  }

  // Registrar edición de un registro
  async registrarEdicion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'editar',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles
    });
  }

  // Registrar eliminación de un registro
  async registrarEliminacion(usuarioId, tabla, registroId, proyectoId = null, detalles = null) {
    return this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'eliminar',
      tabla_afectada: tabla,
      registro_id: registroId,
      proyecto_id: proyectoId,
      detalles
    });
  }

  // Registrar cierre de sesión
  async registrarCierreSesion(usuarioId) {
    return this.registrarAccion({
      usuario_id: usuarioId,
      accion: 'logout',
      tabla_afectada: 'usuarios',
      registro_id: usuarioId,
      detalles: { fecha_cierre: new Date().toISOString() }
    });
  }

  // Contar total de registros con filtros
  async contarTotal({ busqueda = null, usuario = null, accion = null }) {
    let query = this.db
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (busqueda) {
      query = query.or(`accion.ilike.%${busqueda}%,tabla_afectada.ilike.%${busqueda}%,detalles.ilike.%${busqueda}%`);
    }

    if (usuario) {
      query = query.eq('usuario_id', usuario);
    }

    if (accion) {
      query = query.eq('accion', accion);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  }

  // Obtener historial con filtros
  async obtenerHistorial({ limite = 100, offset = 0, busqueda = null, usuario = null, accion = null }) {
    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario)
      `)
      .order('fecha', { ascending: false })
      .range(offset, offset + limite - 1);

    if (busqueda) {
      query = query.or(`accion.ilike.%${busqueda}%,tabla_afectada.ilike.%${busqueda}%,detalles.ilike.%${busqueda}%`);
    }

    if (usuario) {
      query = query.eq('usuario_id', usuario);
    }

    if (accion) {
      query = query.eq('accion', accion);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(a => ({
      ...a,
      nombre_usuario: a.usuarios?.nombre_usuario
    }));
  }

  // Obtener historial por proyecto
  async obtenerPorProyecto(proyectoId, limite = 50) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario)
      `)
      .eq('proyecto_id', proyectoId)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return (data || []).map(a => ({
      ...a,
      nombre_usuario: a.usuarios?.nombre_usuario
    }));
  }

  // Obtener historial por registro
  async obtenerPorRegistro(registroId, limite = 20) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario)
      `)
      .eq('registro_id', registroId)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return (data || []).map(a => ({
      ...a,
      nombre_usuario: a.usuarios?.nombre_usuario
    }));
  }

  // Obtener historial por usuario
  async obtenerPorUsuario(usuarioId, limite = 50) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data || [];
  }

  // Obtener estadísticas de auditoría
  async obtenerEstadisticas() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('accion, tabla_afectada, usuario_id');

    if (error) throw error;

    const total = data.length;
    const porAccion = {};
    const porTabla = {};
    const usuariosActivos = new Set();

    data.forEach(a => {
      porAccion[a.accion] = (porAccion[a.accion] || 0) + 1;
      porTabla[a.tabla_afectada] = (porTabla[a.tabla_afectada] || 0) + 1;
      usuariosActivos.add(a.usuario_id);
    });

    return {
      total,
      porAccion: Object.entries(porAccion).map(([accion, cantidad]) => ({ accion, cantidad })),
      porTabla: Object.entries(porTabla).map(([tabla, cantidad]) => ({ tabla, cantidad })),
      usuarios_activos: usuariosActivos.size
    };
  }

  // Limpiar auditoría antigua
  async limpiarAntiguos(dias = 90) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    const { error } = await this.db
      .from(this.tableName)
      .delete()
      .lt('fecha', fechaLimite.toISOString());

    if (error) throw error;
    return { success: true };
  }

  // Alias para compatibilidad con el controlador
  async limpiarHistorialAntiguo(diasAntiguedad = 365) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    // Contar registros a eliminar
    const { count } = await this.db
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .lt('fecha', fechaLimite.toISOString());

    const { error } = await this.db
      .from(this.tableName)
      .delete()
      .lt('fecha', fechaLimite.toISOString());

    if (error) throw error;

    return {
      success: true,
      registrosEliminados: count || 0
    };
  }

  // Obtener historial completo sin paginación (para exportación)
  async obtenerHistorialCompleto(filtros = {}) {
    const { busqueda = null, usuario = null, accion = null } = filtros;

    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario)
      `)
      .order('fecha', { ascending: false });

    if (busqueda) {
      query = query.or(`accion.ilike.%${busqueda}%,tabla_afectada.ilike.%${busqueda}%,detalles.ilike.%${busqueda}%`);
    }

    if (usuario) {
      query = query.eq('usuario_id', usuario);
    }

    if (accion) {
      query = query.eq('accion', accion);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(a => ({
      ...a,
      nombre_usuario: a.usuarios?.nombre_usuario
    }));
  }
}

module.exports = AuditoriaModel;

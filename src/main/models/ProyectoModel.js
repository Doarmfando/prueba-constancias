const BaseModel = require('./BaseModel');

class ProyectoModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'proyectos_registros');
  }

  // Crear nuevo proyecto
  async crear(datos) {
    const { nombre, descripcion, usuario_creador_id, es_publico = false, permite_edicion = true } = datos;

    try {
      const proyecto = await this.create({
        nombre,
        descripcion,
        usuario_creador_id,
        es_publico,
        permite_edicion,
        activo: true
      });
      return proyecto.id;
    } catch (error) {
      throw new Error('Error al crear proyecto: ' + error.message);
    }
  }

  // Obtener proyecto por ID
  async obtenerPorId(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre)
      `)
      .eq('id', id)
      .eq('activo', true)
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      nombre_creador: data.usuarios?.nombre
    } : null;
  }

  // Listar proyectos por usuario (solo sus propios proyectos)
  async listarPorUsuario(usuarioId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre),
        registros (count)
      `)
      .eq('usuario_creador_id', usuarioId)
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      nombre_creador: p.usuarios?.nombre,
      total_registros: p.registros?.[0]?.count || 0
    }));
  }

  // Listar proyectos accesibles por usuario (propios + públicos)
  async listarAccesiblesPorUsuario(usuarioId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre),
        registros (count)
      `)
      .eq('activo', true)
      .or(`usuario_creador_id.eq.${usuarioId},es_publico.eq.true`)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      nombre_creador: p.usuarios?.nombre,
      total_registros: p.registros?.[0]?.count || 0,
      tipo_acceso: p.usuario_creador_id === usuarioId ? 'propio' : 'publico'
    }));
  }

  // Listar proyectos públicos
  async listarPublicos() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre),
        registros (count)
      `)
      .eq('es_publico', true)
      .eq('activo', true)
      .order('fecha_publicacion', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      nombre_creador: p.usuarios?.nombre,
      total_registros: p.registros?.[0]?.count || 0
    }));
  }

  // Listar todos los proyectos (solo admin)
  async listarTodos() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre),
        registros (count)
      `)
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      nombre_creador: p.usuarios?.nombre,
      total_registros: p.registros?.[0]?.count || 0
    }));
  }

  // Actualizar proyecto
  async actualizar(id, datos, usuarioId) {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    const { nombre, descripcion, permite_edicion } = datos;
    await this.update(id, { nombre, descripcion, permite_edicion });
    return { success: true };
  }

  // Publicar proyecto
  async publicar(id, usuarioId) {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    await this.update(id, {
      es_publico: true,
      fecha_publicacion: new Date().toISOString()
    });
    return { success: true };
  }

  // Despublicar proyecto
  async despublicar(id, usuarioId) {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    await this.update(id, { es_publico: false });
    return { success: true };
  }

  // Eliminar proyecto (eliminación lógica)
  async eliminar(id, usuarioId) {
    const proyecto = await this.obtenerPorId(id);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    await this.update(id, { activo: false });
    return { success: true };
  }

  // Verificar permisos de acceso
  async tieneAcceso(proyectoId, usuarioId) {
    const { data, error} = await this.db
      .from(this.tableName)
      .select('usuario_creador_id, es_publico')
      .eq('id', proyectoId)
      .eq('activo', true)
      .single();

    if (error || !data) return false;
    return data.usuario_creador_id === usuarioId || data.es_publico;
  }

  // Obtener estadísticas del proyecto
  async obtenerEstadisticas(proyectoId) {
    const { count: totalRegistros } = await this.db
      .from('registros')
      .select('*', { count: 'exact', head: true })
      .eq('proyecto_id', proyectoId)
      .eq('eliminado', false);

    return {
      total_registros: totalRegistros || 0
    };
  }
}

module.exports = ProyectoModel;

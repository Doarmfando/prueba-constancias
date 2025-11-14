// src/main/models/EstadoModel.js
const BaseModel = require('./BaseModel');

class EstadoModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'estados');
  }

  // Obtener todos los estados
  async obtenerTodos() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Buscar estado por nombre
  async buscarPorNombre(nombre) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('nombre', nombre)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Buscar estado por ID
  async buscarPorId(id) {
    return await this.getById(id);
  }

  // Obtener ID de estado por nombre (método utilitario)
  async obtenerIdPorNombre(nombre) {
    const estado = await this.buscarPorNombre(nombre);
    return estado ? estado.id : null;
  }

  // Crear nuevo estado
  async crear(nombre) {
    // Verificar si ya existe
    const existe = await this.buscarPorNombre(nombre);
    if (existe) {
      throw new Error("El estado ya existe");
    }

    const estado = await this.create({ nombre });
    return { lastID: estado.id };
  }

  // Actualizar estado
  async actualizar(id, nombre) {
    // Verificar que no exista otro con el mismo nombre
    const { data: existe, error } = await this.db
      .from(this.tableName)
      .select('id')
      .eq('nombre', nombre)
      .neq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (existe) {
      throw new Error("Ya existe otro estado con ese nombre");
    }

    await this.update(id, { nombre });
    return { success: true };
  }

  // Eliminar estado (solo si no tiene registros asociados)
  async eliminar(id) {
    // Verificar si tiene registros asociados
    const tieneRegistros = await this.contar({ estado_id: id });

    if (tieneRegistros > 0) {
      throw new Error("No se puede eliminar el estado porque tiene registros asociados");
    }

    await this.delete(id);
    return { success: true };
  }

  // Obtener estadísticas por estado
  async obtenerEstadisticas() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        nombre,
        registros(count)
      `)
      .order('id', { ascending: true });

    if (error) throw error;

    return (data || []).map(e => ({
      nombre: e.nombre,
      total_registros: e.registros?.[0]?.count || 0
    }));
  }

  // Inicializar estados por defecto
  async inicializarEstadosDefecto() {
    const estadosDefecto = ['Recibido', 'En Caja', 'Entregado', 'Tesoreria'];

    for (const estado of estadosDefecto) {
      try {
        const existe = await this.buscarPorNombre(estado);
        if (!existe) {
          await this.create({ nombre: estado });
        }
      } catch (error) {
        // Ignorar errores de duplicados
        if (error.code !== '23505') {
          console.error(`Error inicializando estado ${estado}:`, error);
        }
      }
    }
  }
}

module.exports = EstadoModel;

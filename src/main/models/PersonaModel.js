// src/main/models/PersonaModel.js
const BaseModel = require('./BaseModel');

class PersonaModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'personas');
  }

  // Crear nueva persona
  async crear(nombre, dni, numero) {
    const persona = await this.create({ nombre, dni, numero });
    return { lastID: persona.id };
  }

  // Buscar persona por DNI
  async buscarPorDni(dni) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('dni', dni)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Buscar persona por ID
  async buscarPorId(id) {
    return await this.getById(id);
  }

  // Actualizar datos de persona
  async actualizar(id, datos) {
    const { nombre, numero, dni } = datos;
    await this.update(id, { nombre, numero, dni });
    return { changes: 1 };
  }

  // Obtener todas las personas
  async obtenerTodas() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Verificar si DNI ya existe
  async dniExiste(dni, excludeId = null) {
    let query = this.db
      .from(this.tableName)
      .select('id')
      .eq('dni', dni);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // Eliminar persona (solo si no tiene registros)
  async eliminar(id) {
    // Verificar si tiene registros asociados
    const tieneRegistros = await this.contar({ persona_id: id });

    if (tieneRegistros > 0) {
      throw new Error("No se puede eliminar la persona porque tiene registros asociados");
    }

    const { error } = await this.delete(id);

    if (error) {
      throw new Error("Persona no encontrada");
    }

    return { success: true };
  }

  // Buscar personas por nombre (búsqueda parcial)
  async buscarPorNombre(nombre) {
    return await this.search('nombre', nombre, '*');
  }

  // Obtener estadísticas de personas
  async obtenerEstadisticas() {
    const total = await this.contar();

    const { data: registros, error } = await this.db
      .from('registros')
      .select('persona_id')
      .eq('eliminado', false);

    if (error) throw error;

    const personasUnicas = new Set(registros.map(r => r.persona_id));
    const conRegistros = personasUnicas.size;

    return {
      total,
      conRegistros,
      sinRegistros: total - conRegistros
    };
  }

  // Verificar si tiene registros asociados
  async tieneRegistros(personaId) {
    const count = await this.contar({ persona_id: personaId });
    return count > 0;
  }

  // Obtener personas con conteo de documentos y registros
  async obtenerConDocumentos() {
    // Nota: Supabase no soporta GROUP BY directamente en el cliente
    // Usaremos una aproximación alternativa
    const { data: personas, error: errorPersonas } = await this.db
      .from(this.tableName)
      .select(`
        *,
        registros(count),
        documentos_persona(count)
      `)
      .order('nombre', { ascending: true });

    if (errorPersonas) throw errorPersonas;

    return (personas || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      numero: p.numero,
      total_registros: p.registros?.[0]?.count || 0,
      total_documentos: p.documentos_persona?.[0]?.count || 0
    }));
  }

  // Buscar personas por término (DNI o nombre)
  async buscar(termino) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        registros!inner(count),
        documentos_persona(count)
      `)
      .or(`dni.ilike.%${termino}%,nombre.ilike.%${termino}%`)
      .order('nombre', { ascending: true });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      numero: p.numero,
      total_registros: p.registros?.[0]?.count || 0,
      total_documentos: p.documentos_persona?.[0]?.count || 0
    }));
  }
}

module.exports = PersonaModel;
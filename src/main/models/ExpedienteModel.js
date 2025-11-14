// src/main/models/ExpedienteModel.js
const BaseModel = require('./BaseModel');

class ExpedienteModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'expedientes');
  }

  // Crear nuevo expediente
  async crear(personaId, codigo, fechaSolicitud = null, fechaEntrega = null, observacion = null) {
    const expediente = await this.create({
      persona_id: personaId,
      codigo: codigo || null,
      fecha_solicitud: fechaSolicitud,
      fecha_entrega: fechaEntrega,
      observacion
    });
    return { lastID: expediente.id };
  }

  // Buscar expediente por código
  async buscarPorCodigo(codigo) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Buscar expediente por ID
  async buscarPorId(id) {
    return await this.getById(id);
  }

  // Actualizar expediente
  async actualizar(id, datos) {
    const { codigo, fechaSolicitud, fechaEntrega, observacion } = datos;
    await this.update(id, {
      codigo: codigo || null,
      fecha_solicitud: fechaSolicitud,
      fecha_entrega: fechaEntrega,
      observacion
    });
    return { changes: 1 };
  }

  // Actualizar información específica (para vista de información)
  async actualizarInformacion(id, datos) {
    const { observacion, fechaSolicitud, fechaEntrega } = datos;
    await this.update(id, {
      observacion: observacion || null,
      fecha_solicitud: fechaSolicitud || null,
      fecha_entrega: fechaEntrega || null
    });
    return { changes: 1 };
  }

  // Obtener expedientes por persona
  async obtenerPorPersona(personaId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni)
      `)
      .eq('persona_id', personaId)
      .order('id', { ascending: false });

    if (error) throw error;

    return (data || []).map(e => ({
      ...e,
      nombre: e.personas?.nombre,
      dni: e.personas?.dni
    }));
  }

  // Obtener todos los expedientes con información de persona
  async obtenerTodos() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni, numero)
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    return (data || []).map(e => ({
      ...e,
      nombre: e.personas?.nombre,
      dni: e.personas?.dni,
      numero: e.personas?.numero
    }));
  }

  // Verificar si código ya existe
  async codigoExiste(codigo, excludeId = null) {
    if (!codigo || codigo.trim() === '') {
      return false;
    }

    let query = this.db
      .from(this.tableName)
      .select('id')
      .eq('codigo', codigo);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // Eliminar expediente (solo si no tiene registros)
  async eliminar(id) {
    // Verificar si tiene registros asociados
    const tieneRegistros = await this.contar({ expediente_id: id });

    if (tieneRegistros > 0) {
      throw new Error("No se puede eliminar el expediente porque tiene registros asociados");
    }

    await this.delete(id);
    return { success: true };
  }

  // Buscar expedientes por rango de fechas
  async buscarPorFecha(fechaInicio, fechaFin, tipofecha = 'solicitud') {
    const campoFecha = tipofecha === 'entrega' ? 'fecha_entrega' : 'fecha_solicitud';

    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni)
      `)
      .gte(campoFecha, fechaInicio)
      .lte(campoFecha, fechaFin)
      .order(campoFecha, { ascending: false });

    if (error) throw error;

    return (data || []).map(e => ({
      ...e,
      nombre: e.personas?.nombre,
      dni: e.personas?.dni
    }));
  }

  // Obtener expedientes entregados
  async obtenerEntregados() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni)
      `)
      .not('fecha_entrega', 'is', null)
      .order('fecha_entrega', { ascending: false });

    if (error) throw error;

    return (data || []).map(e => ({
      ...e,
      nombre: e.personas?.nombre,
      dni: e.personas?.dni
    }));
  }

  // Obtener expedientes pendientes de entrega
  async obtenerPendientes() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni)
      `)
      .is('fecha_entrega', null)
      .order('fecha_solicitud', { ascending: true });

    if (error) throw error;

    return (data || []).map(e => ({
      ...e,
      nombre: e.personas?.nombre,
      dni: e.personas?.dni
    }));
  }

  // Marcar como entregado
  async marcarComoEntregado(id, fechaEntrega = null) {
    const fecha = fechaEntrega || this.getFechaLocal();

    await this.update(id, { fecha_entrega: fecha });
    return { changes: 1 };
  }

  // Obtener estadísticas de expedientes
  async obtenerEstadisticas() {
    const total = await this.contar();

    const { count: entregados, error } = await this.db
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .not('fecha_entrega', 'is', null);

    if (error) throw error;

    const pendientes = total - (entregados || 0);

    // Estadísticas por año (simplificado en cliente)
    const { data: expedientes } = await this.db
      .from(this.tableName)
      .select('fecha_solicitud')
      .not('fecha_solicitud', 'is', null);

    const porAnio = {};
    (expedientes || []).forEach(e => {
      const anio = new Date(e.fecha_solicitud).getFullYear();
      porAnio[anio] = (porAnio[anio] || 0) + 1;
    });

    const porAnioArray = Object.entries(porAnio).map(([anio, total]) => ({
      anio,
      total
    })).sort((a, b) => b.anio - a.anio);

    return {
      total,
      entregados: entregados || 0,
      pendientes,
      porAnio: porAnioArray
    };
  }

  getFechaLocal() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }
}

module.exports = ExpedienteModel;

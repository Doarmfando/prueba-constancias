const BaseModel = require('./BaseModel');

class RegistroModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'registros');
  }

  // Crear nuevo registro
  async crear(datos) {
    const {
      proyecto_id,
      persona_id,
      expediente_id,
      estado_id,
      usuario_creador_id,
      fecha_en_caja = null
    } = datos;

    const registro = await this.create({
      proyecto_id,
      persona_id,
      expediente_id,
      estado_id,
      usuario_creador_id,
      fecha_en_caja,
      eliminado: false
    });

    return { lastID: registro.id };
  }

  // Agregar nuevo registro (con lógica completa de persona y expediente)
  async agregar(datos) {
    try {
      console.log('📝 RegistroModel.agregar - Datos recibidos:', JSON.stringify(datos, null, 2));

      const {
        nombre,
        dni,
        numero = '',
        expediente_codigo = '',
        fecha_solicitud,
        fecha_entrega,
        observacion = '',
        estado_id,
        proyecto_id = 1,
        usuario_creador_id = 1,
        fecha_en_caja = null
      } = datos;

      console.log('📝 Valores extraídos:');
      console.log('  - estado_id:', estado_id, 'Tipo:', typeof estado_id);
      console.log('  - proyecto_id:', proyecto_id);
      console.log('  - usuario_creador_id:', usuario_creador_id);

      // Validar que estado_id exista
      if (!estado_id) {
        throw new Error('El estado_id es requerido');
      }

      // 1. Buscar o crear persona
      let persona = null;
      if (dni) {
        const { data: personaExistente, error: errorBuscarPersona } = await this.db
          .from('personas')
          .select('*')
          .eq('dni', dni)
          .single();

        if (errorBuscarPersona && errorBuscarPersona.code !== 'PGRST116') {
          throw errorBuscarPersona;
        }

        persona = personaExistente;
      }

      if (!persona && nombre && dni) {
        // Crear nueva persona
        const { data: nuevaPersona, error: errorCrearPersona } = await this.db
          .from('personas')
          .insert({ nombre, dni, numero })
          .select()
          .single();

        if (errorCrearPersona) throw errorCrearPersona;
        persona = nuevaPersona;
      }

      if (!persona) {
        throw new Error('No se pudo crear o encontrar la persona');
      }

      // 2. Buscar o crear expediente
      let expediente = null;
      if (expediente_codigo) {
        const { data: expedienteExistente, error: errorBuscarExpediente } = await this.db
          .from('expedientes')
          .select('*')
          .eq('codigo', expediente_codigo)
          .eq('persona_id', persona.id)
          .single();

        if (errorBuscarExpediente && errorBuscarExpediente.code !== 'PGRST116') {
          throw errorBuscarExpediente;
        }

        expediente = expedienteExistente;
      }

      if (!expediente) {
        // Crear nuevo expediente
        const { data: nuevoExpediente, error: errorCrearExpediente } = await this.db
          .from('expedientes')
          .insert({
            persona_id: persona.id,
            codigo: expediente_codigo || null,
            fecha_solicitud,
            fecha_entrega: fecha_entrega || null,
            observacion
          })
          .select()
          .single();

        if (errorCrearExpediente) throw errorCrearExpediente;
        expediente = nuevoExpediente;
      }

      // 3. Crear registro
      const { data: nuevoRegistro, error: errorCrearRegistro } = await this.db
        .from(this.tableName)
        .insert({
          proyecto_id,
          persona_id: persona.id,
          expediente_id: expediente.id,
          estado_id,
          usuario_creador_id,
          fecha_en_caja,
          eliminado: false
        })
        .select()
        .single();

      if (errorCrearRegistro) throw errorCrearRegistro;

      // 4. Obtener registro completo con relaciones
      const registroCompleto = await this.obtenerPorId(nuevoRegistro.id);

      return registroCompleto || nuevoRegistro;
    } catch (error) {
      console.error('Error en agregar registro:', error);
      throw error;
    }
  }

  // Obtener registro por ID con información completa
  async obtenerPorId(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni, numero),
        expedientes (codigo, fecha_solicitud, fecha_entrega, observacion),
        estados (nombre),
        usuarios (nombre_usuario, nombre),
        proyectos_registros (nombre)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      persona_nombre: data.personas?.nombre,
      persona_dni: data.personas?.dni,
      persona_numero: data.personas?.numero,
      expediente_codigo: data.expedientes?.codigo,
      expediente_fecha_solicitud: data.expedientes?.fecha_solicitud,
      expediente_fecha_entrega: data.expedientes?.fecha_entrega,
      expediente_observacion: data.expedientes?.observacion,
      estado_nombre: data.estados?.nombre,
      usuario_nombre: data.usuarios?.nombre,
      usuario_nombre_usuario: data.usuarios?.nombre_usuario,
      proyecto_nombre: data.proyectos_registros?.nombre
    } : null;
  }

  // Obtener registros por proyecto
  async obtenerPorProyecto(proyectoId, opciones = {}) {
    const {
      estado_id = null,
      busqueda = null,
      orden = 'fecha_registro',
      direccion = 'desc',
      limite = 100,
      offset = 0
    } = opciones;

    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni),
        expedientes (codigo),
        estados (nombre)
      `)
      .eq('proyecto_id', proyectoId)
      .eq('eliminado', false)
      .order(orden, { ascending: direccion === 'asc' })
      .range(offset, offset + limite - 1);

    if (estado_id) {
      query = query.eq('estado_id', estado_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(r => ({
      ...r,
      persona_nombre: r.personas?.nombre,
      persona_dni: r.personas?.dni,
      expediente_codigo: r.expedientes?.codigo,
      estado_nombre: r.estados?.nombre
    }));
  }

  // Actualizar registro completo (con lógica de persona y expediente)
  async actualizar(datos) {
    try {
      const {
        id,
        nombre,
        dni,
        numero,
        expediente_codigo,
        fecha_solicitud,
        fecha_entrega,
        observacion,
        estado_id,
        fecha_en_caja
      } = datos;

      // Obtener el registro actual
      const registroActual = await this.getById(id);
      if (!registroActual) {
        throw new Error('Registro no encontrado');
      }

      // Actualizar persona si hay cambios
      if (registroActual.persona_id && (nombre || dni !== undefined || numero !== undefined)) {
        const datosPersona = {};
        if (nombre) datosPersona.nombre = nombre;
        if (dni !== undefined) datosPersona.dni = dni;
        if (numero !== undefined) datosPersona.numero = numero;

        if (Object.keys(datosPersona).length > 0) {
          await this.db
            .from('personas')
            .update(datosPersona)
            .eq('id', registroActual.persona_id);
        }
      }

      // Actualizar expediente si hay cambios
      if (registroActual.expediente_id && (expediente_codigo !== undefined || fecha_solicitud || fecha_entrega !== undefined || observacion !== undefined)) {
        const datosExpediente = {};
        if (expediente_codigo !== undefined) datosExpediente.codigo = expediente_codigo || null;
        if (fecha_solicitud) datosExpediente.fecha_solicitud = fecha_solicitud;
        if (fecha_entrega !== undefined) datosExpediente.fecha_entrega = fecha_entrega || null;
        if (observacion !== undefined) datosExpediente.observacion = observacion;

        if (Object.keys(datosExpediente).length > 0) {
          await this.db
            .from('expedientes')
            .update(datosExpediente)
            .eq('id', registroActual.expediente_id);
        }
      }

      // Actualizar registro
      const datosRegistro = {};
      if (estado_id) datosRegistro.estado_id = estado_id;
      if (fecha_en_caja !== undefined) datosRegistro.fecha_en_caja = fecha_en_caja;

      if (Object.keys(datosRegistro).length > 0) {
        await this.update(id, datosRegistro);
      }

      // Obtener registro completo actualizado
      const registroCompleto = await this.obtenerPorId(id);
      return registroCompleto;
    } catch (error) {
      console.error('Error en actualizar registro:', error);
      throw error;
    }
  }

  // Actualizar estado del registro
  async actualizarEstado(id, estadoId, usuarioId) {
    await this.update(id, { estado_id: estadoId });
    return { changes: 1 };
  }

  // Actualizar fecha en caja
  async actualizarFechaEnCaja(id, fecha, usuarioId) {
    await this.update(id, { fecha_en_caja: fecha });
    return { changes: 1 };
  }

  // Mover a papelera (eliminación lógica)
  async moverAPapelera(id, usuarioId) {
    await this.update(id, { eliminado: true });
    return { success: true, message: 'Registro movido a papelera' };
  }

  // Eliminar registro (eliminación lógica)
  async eliminar(id, usuarioId) {
    await this.update(id, { eliminado: true });
    return { success: true };
  }

  // Restaurar registro eliminado
  async restaurar(id, usuarioId) {
    await this.update(id, { eliminado: false });
    return { success: true };
  }

  // Contar registros por proyecto
  async contarPorProyecto(proyectoId, soloActivos = true) {
    const filtros = { proyecto_id: proyectoId };
    if (soloActivos) {
      filtros.eliminado = false;
    }
    return await this.contar(filtros);
  }

  // Obtener estadísticas del proyecto
  async obtenerEstadisticasProyecto(proyectoId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('estado_id, eliminado')
      .eq('proyecto_id', proyectoId);

    if (error) throw error;

    const total = data.length;
    const activos = data.filter(r => !r.eliminado).length;
    const eliminados = total - activos;

    const porEstado = {};
    data.filter(r => !r.eliminado).forEach(r => {
      porEstado[r.estado_id] = (porEstado[r.estado_id] || 0) + 1;
    });

    return {
      total,
      activos,
      eliminados,
      porEstado: Object.entries(porEstado).map(([estado_id, cantidad]) => ({
        estado_id: parseInt(estado_id),
        cantidad
      }))
    };
  }

  // Buscar registros
  async buscar(termino, proyectoId = null, limite = 50) {
    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        personas (nombre, dni),
        expedientes (codigo),
        estados (nombre)
      `)
      .eq('eliminado', false)
      .limit(limite);

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const resultados = (data || []).filter(r => {
      const textoCompleto = `${r.personas?.nombre} ${r.personas?.dni} ${r.expedientes?.codigo}`.toLowerCase();
      return textoCompleto.includes(termino.toLowerCase());
    });

    return resultados.map(r => ({
      ...r,
      persona_nombre: r.personas?.nombre,
      persona_dni: r.personas?.dni,
      expediente_codigo: r.expedientes?.codigo,
      estado_nombre: r.estados?.nombre
    }));
  }

  // Verificar duplicados
  async existeRegistro(proyectoId, personaId, expedienteId) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('id')
      .eq('proyecto_id', proyectoId)
      .eq('persona_id', personaId)
      .eq('expediente_id', expedienteId)
      .eq('eliminado', false)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // Buscar registros por DNI de persona
  async buscarPorDni(dni) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        personas (id, nombre, dni, numero),
        expedientes (id, codigo, fecha_solicitud, fecha_entrega, observacion),
        estados (nombre),
        proyectos_registros (nombre)
      `)
      .eq('eliminado', false)
      .order('fecha_registro', { ascending: false });

    if (error) throw error;

    // Filtrar por DNI (ya que no podemos hacer join directo en el where)
    const registrosFiltrados = (data || []).filter(r => r.personas?.dni === dni);

    return registrosFiltrados.map(r => ({
      registro_id: r.id,
      persona_id: r.personas?.id,
      expediente_id: r.expedientes?.id,
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      codigo: r.expedientes?.codigo,
      expediente: r.expedientes?.codigo,
      fecha_solicitud: r.expedientes?.fecha_solicitud,
      fecha_entrega: r.expedientes?.fecha_entrega,
      observacion: r.expedientes?.observacion,
      estado_nombre: r.estados?.nombre,
      estado: r.estados?.nombre,
      fecha_registro: r.fecha_registro,
      fecha_en_caja: r.fecha_en_caja || 'No entregado',
      proyecto_nombre: r.proyectos_registros?.nombre,
      estado_id: r.estado_id
    }));
  }

  // Obtener todos los registros activos (no eliminados)
  async obtenerTodos(proyectoId = null) {
    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        personas (id, nombre, dni, numero),
        expedientes (id, codigo, fecha_solicitud, fecha_entrega, observacion),
        estados (nombre),
        proyectos_registros (nombre),
        usuarios (nombre_usuario, nombre)
      `)
      .eq('eliminado', false)
      .order('fecha_registro', { ascending: false });

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      proyecto_id: r.proyecto_id,
      persona_id: r.persona_id,
      expediente_id: r.expediente_id,
      estado_id: r.estado_id,
      usuario_creador_id: r.usuario_creador_id,
      fecha_registro: r.fecha_registro,
      fecha_en_caja: r.fecha_en_caja,
      eliminado: r.eliminado,
      // Datos de relaciones
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      expediente: r.expedientes?.codigo,
      codigo: r.expedientes?.codigo,
      fecha_solicitud: r.expedientes?.fecha_solicitud,
      fecha_entrega: r.expedientes?.fecha_entrega,
      observacion: r.expedientes?.observacion,
      estado: r.estados?.nombre,
      estado_nombre: r.estados?.nombre,
      proyecto_nombre: r.proyectos_registros?.nombre,
      usuario_nombre: r.usuarios?.nombre,
      usuario_nombre_usuario: r.usuarios?.nombre_usuario
    }));
  }

  // Obtener todos los registros eliminados
  async obtenerEliminados(proyectoId = null) {
    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        personas (id, nombre, dni, numero),
        expedientes (id, codigo, fecha_solicitud, fecha_entrega, observacion),
        estados (nombre),
        proyectos_registros (nombre),
        usuarios (nombre_usuario, nombre)
      `)
      .eq('eliminado', true)
      .order('fecha_registro', { ascending: false });

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      proyecto_id: r.proyecto_id,
      persona_id: r.persona_id,
      expediente_id: r.expediente_id,
      estado_id: r.estado_id,
      usuario_creador_id: r.usuario_creador_id,
      fecha_registro: r.fecha_registro,
      fecha_en_caja: r.fecha_en_caja,
      eliminado: r.eliminado,
      // Datos de relaciones
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      expediente: r.expedientes?.codigo,
      codigo: r.expedientes?.codigo,
      fecha_solicitud: r.expedientes?.fecha_solicitud,
      fecha_entrega: r.expedientes?.fecha_entrega,
      observacion: r.expedientes?.observacion,
      estado: r.estados?.nombre,
      estado_nombre: r.estados?.nombre,
      proyecto_nombre: r.proyectos_registros?.nombre,
      usuario_nombre: r.usuarios?.nombre,
      usuario_nombre_usuario: r.usuarios?.nombre_usuario
    }));
  }
}

module.exports = RegistroModel;

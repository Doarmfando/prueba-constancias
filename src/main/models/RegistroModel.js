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
      const {
        nombre,
        dni,
        numero = '',
        expediente_codigo = '',
        fecha_registro, // Fecha para la tabla registros
        fecha_solicitud, // Fecha para la tabla expedientes
        fecha_entrega,
        observacion = '',
        estado_id,
        proyecto_id = 1,
        usuario_creador_id = 1,
        fecha_en_caja = null
      } = datos;

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
        // Asegurar que las fechas estén en formato yyyy-MM-dd
        const fechaSolicitudFormateada = fecha_solicitud ?
          (fecha_solicitud.includes('T') ? fecha_solicitud.split('T')[0] : fecha_solicitud) : null;
        const fechaEntregaFormateada = fecha_entrega ?
          (fecha_entrega.includes('T') ? fecha_entrega.split('T')[0] : fecha_entrega) : null;

        const { data: nuevoExpediente, error: errorCrearExpediente } = await this.db
          .from('expedientes')
          .insert({
            persona_id: persona.id,
            codigo: expediente_codigo || null,
            fecha_solicitud: fechaSolicitudFormateada,
            fecha_entrega: fechaEntregaFormateada,
            observacion
          })
          .select()
          .single();

        if (errorCrearExpediente) throw errorCrearExpediente;
        expediente = nuevoExpediente;
      }

      // 3. Crear registro
      // Asegurar que las fechas estén en formato yyyy-MM-dd
      const fechaEnCajaFormateada = fecha_en_caja ?
        (fecha_en_caja.includes('T') ? fecha_en_caja.split('T')[0] : fecha_en_caja) : null;

      const fechaRegistroFormateada = fecha_registro ?
        (fecha_registro.includes('T') ? fecha_registro.split('T')[0] : fecha_registro) : null;

      const { data: nuevoRegistro, error: errorCrearRegistro } = await this.db
        .from(this.tableName)
        .insert({
          proyecto_id,
          persona_id: persona.id,
          expediente_id: expediente.id,
          estado_id,
          usuario_creador_id,
          fecha_registro: fechaRegistroFormateada, // Insertar fecha_registro
          fecha_en_caja: fechaEnCajaFormateada,
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
        usuario_creador:usuarios!usuario_creador_id (nombre_usuario, nombre),
        proyectos_registros (nombre)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    return data ? {
      ...data,
      fecha_registro: formatearFecha(data.fecha_registro),
      fecha_en_caja: formatearFecha(data.fecha_en_caja),
      persona_nombre: data.personas?.nombre,
      persona_dni: data.personas?.dni,
      persona_numero: data.personas?.numero,
      expediente_codigo: data.expedientes?.codigo,
      expediente_fecha_solicitud: formatearFecha(data.expedientes?.fecha_solicitud),
      expediente_fecha_entrega: formatearFecha(data.expedientes?.fecha_entrega),
      expediente_observacion: data.expedientes?.observacion,
      estado_nombre: data.estados?.nombre,
      usuario_nombre: data.usuario_creador?.nombre,
      usuario_nombre_usuario: data.usuario_creador?.nombre_usuario,
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
        personas (nombre, dni, numero),
        expedientes (codigo),
        estados (nombre)
      `)
      .eq('proyecto_id', proyectoId)
      .eq('eliminado', false)
      .order('id', { ascending: true })
      .range(offset, offset + limite - 1);

    if (estado_id) {
      query = query.eq('estado_id', estado_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    return (data || []).map(r => ({
      ...r,
      fecha_registro: formatearFecha(r.fecha_registro),
      fecha_en_caja: formatearFecha(r.fecha_en_caja),
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
        fecha_registro, // Puede venir como fecha_registro del frontend
        fecha_entrega,
        observacion,
        estado_id,
        fecha_en_caja
      } = datos;

      // Si viene fecha_registro en lugar de fecha_solicitud, usarla
      const fechaSolicitudFinal = fecha_registro || fecha_solicitud;

      console.log('🔄 [RegistroModel.actualizar] Datos recibidos:', {
        id,
        nombre,
        dni,
        numero,
        expediente_codigo,
        fecha_registro,
        fecha_solicitud,
        fechaSolicitudFinal,
        estado_id,
        fecha_en_caja
      });

      // Obtener el registro actual
      const registroActual = await this.getById(id);
      if (!registroActual) {
        throw new Error('Registro no encontrado');
      }

      console.log('📋 [RegistroModel.actualizar] Registro actual:', {
        id: registroActual.id,
        estado_id: registroActual.estado_id,
        fecha_en_caja: registroActual.fecha_en_caja
      });

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
      if (registroActual.expediente_id && (expediente_codigo !== undefined || fechaSolicitudFinal || fecha_entrega !== undefined || observacion !== undefined)) {
        const datosExpediente = {};
        if (expediente_codigo !== undefined) datosExpediente.codigo = expediente_codigo || null;
        if (fechaSolicitudFinal) {
          // Asegurar formato yyyy-MM-dd
          datosExpediente.fecha_solicitud = fechaSolicitudFinal.includes('T') ?
            fechaSolicitudFinal.split('T')[0] : fechaSolicitudFinal;
        }
        if (fecha_entrega !== undefined) {
          // Asegurar formato yyyy-MM-dd
          datosExpediente.fecha_entrega = fecha_entrega ?
            (fecha_entrega.includes('T') ? fecha_entrega.split('T')[0] : fecha_entrega) : null;
        }
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
      if (fecha_registro !== undefined) {
        // Asegurar formato yyyy-MM-dd para fecha_registro
        datosRegistro.fecha_registro = fecha_registro ?
          (fecha_registro.includes('T') ? fecha_registro.split('T')[0] : fecha_registro) : null;
      }
      if (fecha_en_caja !== undefined) {
        // Asegurar formato yyyy-MM-dd o null
        datosRegistro.fecha_en_caja = fecha_en_caja ?
          (fecha_en_caja.includes('T') ? fecha_en_caja.split('T')[0] : fecha_en_caja) : null;
      }

      console.log('💾 [RegistroModel.actualizar] Datos a actualizar en registro:', datosRegistro);

      if (Object.keys(datosRegistro).length > 0) {
        await this.update(id, datosRegistro);
        console.log('✅ [RegistroModel.actualizar] Registro actualizado exitosamente');
      } else {
        console.log('⚠️ [RegistroModel.actualizar] No hay datos de registro para actualizar');
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
    await this.update(id, {
      eliminado: true,
      eliminado_por: usuarioId,
      fecha_eliminacion: new Date().toISOString()
    });
    return { success: true, message: 'Registro movido a papelera' };
  }

  // Eliminar registro (eliminación lógica)
  async eliminar(id, usuarioId) {
    await this.update(id, { eliminado: true });
    return { success: true };
  }

  // Restaurar registro eliminado
  async restaurar(id, usuarioId) {
    await this.update(id, {
      eliminado: false,
      eliminado_por: null,
      fecha_eliminacion: null
    });
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

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    return resultados.map(r => ({
      ...r,
      fecha_registro: formatearFecha(r.fecha_registro),
      fecha_en_caja: formatearFecha(r.fecha_en_caja),
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

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    return registrosFiltrados.map(r => ({
      registro_id: r.id,
      persona_id: r.personas?.id,
      expediente_id: r.expedientes?.id,
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      codigo: r.expedientes?.codigo,
      expediente: r.expedientes?.codigo,
      fecha_solicitud: formatearFecha(r.expedientes?.fecha_solicitud),
      fecha_entrega: formatearFecha(r.expedientes?.fecha_entrega),
      observacion: r.expedientes?.observacion,
      estado_nombre: r.estados?.nombre,
      estado: r.estados?.nombre,
      fecha_registro: formatearFecha(r.fecha_registro),
      fecha_en_caja: r.fecha_en_caja ? formatearFecha(r.fecha_en_caja) : 'No entregado',
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
        usuario_creador:usuarios!usuario_creador_id (nombre_usuario, nombre)
      `)
      .eq('eliminado', false)
      .order('id', { ascending: true });

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    return (data || []).map(r => ({
      id: r.id,
      proyecto_id: r.proyecto_id,
      persona_id: r.persona_id,
      expediente_id: r.expediente_id,
      estado_id: r.estado_id,
      usuario_creador_id: r.usuario_creador_id,
      fecha_registro: formatearFecha(r.fecha_registro),
      fecha_en_caja: formatearFecha(r.fecha_en_caja),
      eliminado: r.eliminado,
      // Datos de relaciones
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      expediente: r.expedientes?.codigo,
      codigo: r.expedientes?.codigo,
      fecha_solicitud: formatearFecha(r.expedientes?.fecha_solicitud),
      fecha_entrega: formatearFecha(r.expedientes?.fecha_entrega),
      observacion: r.expedientes?.observacion,
      estado: r.estados?.nombre,
      estado_nombre: r.estados?.nombre,
      proyecto_nombre: r.proyectos_registros?.nombre,
      usuario_nombre: r.usuario_creador?.nombre,
      usuario_nombre_usuario: r.usuario_creador?.nombre_usuario
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
        usuario_creador:usuarios!usuario_creador_id (nombre_usuario, nombre),
        usuario_elimino:usuarios!eliminado_por (nombre_usuario, nombre)
      `)
      .eq('eliminado', true)
      .order('fecha_eliminacion', { ascending: false });

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Función auxiliar para convertir timestamp a yyyy-MM-dd
    const formatearFecha = (fecha) => {
      if (!fecha) return null;
      return fecha.split('T')[0];
    };

    const formatearFechaHora = (fecha) => {
      if (!fecha) return null;
      return new Date(fecha).toLocaleString('es-ES');
    };

    return (data || []).map(r => ({
      id: r.id,
      proyecto_id: r.proyecto_id,
      persona_id: r.persona_id,
      expediente_id: r.expediente_id,
      estado_id: r.estado_id,
      usuario_creador_id: r.usuario_creador_id,
      fecha_registro: formatearFecha(r.fecha_registro),
      fecha_en_caja: formatearFecha(r.fecha_en_caja),
      eliminado: r.eliminado,
      eliminado_por: r.eliminado_por,
      fecha_eliminacion: r.fecha_eliminacion,
      // Datos de relaciones
      nombre: r.personas?.nombre,
      dni: r.personas?.dni,
      numero: r.personas?.numero,
      expediente: r.expedientes?.codigo,
      codigo: r.expedientes?.codigo,
      fecha_solicitud: formatearFecha(r.expedientes?.fecha_solicitud),
      fecha_entrega: formatearFecha(r.expedientes?.fecha_entrega),
      observacion: r.expedientes?.observacion,
      estado: r.estados?.nombre,
      estado_nombre: r.estados?.nombre,
      proyecto_nombre: r.proyectos_registros?.nombre,
      usuario_nombre: r.usuario_creador?.nombre,
      usuario_nombre_usuario: r.usuario_creador?.nombre_usuario,
      eliminado_por_nombre: r.usuario_elimino?.nombre || r.usuario_elimino?.nombre_usuario || 'Sistema'
    }));
  }
}

module.exports = RegistroModel;

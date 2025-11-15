// src/main/models/DocumentoPersonaModel.js
const BaseModel = require('./BaseModel');

class DocumentoPersonaModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'documentos_persona');
  }

  // Crear documento
  async crear(datos) {
    const { persona_id, nombre_archivo, ruta_archivo, tipo_archivo, comentario, usuario_carga_id, tamaño_bytes } = datos;

    const documento = await this.create({
      persona_id,
      nombre_archivo,
      ruta_archivo,
      tipo_archivo: tipo_archivo || this.obtenerTipoArchivo(nombre_archivo),
      comentario: comentario || '',
      usuario_carga_id: usuario_carga_id || null,
      tamaño_bytes: tamaño_bytes || 0
    });

    return { id: documento.id };
  }

  // Obtener documentos por persona_id
  async obtenerPorPersona(persona_id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario)
      `)
      .eq('persona_id', persona_id)
      .order('fecha_carga', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      ...d,
      usuario_carga_nombre: d.usuarios?.nombre_usuario
    }));
  }

  // Obtener documento por ID
  async obtenerPorId(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario),
        personas (nombre, dni)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      usuario_carga_nombre: data.usuarios?.nombre_usuario,
      persona_nombre: data.personas?.nombre,
      persona_dni: data.personas?.dni
    } : null;
  }

  // Eliminar documento
  async eliminar(id) {
    await this.delete(id);
    return { changes: 1 };
  }

  // Actualizar comentario
  async actualizarComentario(id, comentario) {
    await this.update(id, { comentario });
    return { changes: 1 };
  }

  // Contar documentos por persona
  async contarPorPersona(persona_id) {
    const count = await this.contar({ persona_id });
    return count;
  }

  // Obtener estadísticas de documentos
  async obtenerEstadisticas() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('tipo_archivo, persona_id');

    if (error) throw error;

    const total_documentos = data.length;
    const personas_con_documentos = new Set(data.map(d => d.persona_id)).size;

    const porTipo = {};
    data.forEach(d => {
      porTipo[d.tipo_archivo] = (porTipo[d.tipo_archivo] || 0) + 1;
    });

    const estadisticas = Object.entries(porTipo).map(([tipo_archivo, cantidad]) => ({
      tipo_archivo,
      cantidad
    }));

    return [{
      total_documentos,
      personas_con_documentos,
      estadisticas
    }];
  }

  // Método auxiliar para obtener tipo de archivo por extensión
  obtenerTipoArchivo(nombre_archivo) {
    const extension = nombre_archivo.split('.').pop().toLowerCase();

    const tipos = {
      'pdf': 'pdf',
      'doc': 'word',
      'docx': 'word',
      'xls': 'excel',
      'xlsx': 'excel',
      'jpg': 'imagen',
      'jpeg': 'imagen',
      'png': 'imagen',
      'gif': 'imagen',
      'bmp': 'imagen',
      'txt': 'texto',
      'zip': 'comprimido',
      'rar': 'comprimido'
    };

    return tipos[extension] || 'otro';
  }

  // Buscar documentos por nombre o comentario
  async buscar(termino) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        usuarios (nombre_usuario),
        personas (nombre, dni)
      `)
      .or(`nombre_archivo.ilike.%${termino}%,comentario.ilike.%${termino}%`)
      .order('fecha_carga', { ascending: false });

    if (error) throw error;

    // También buscar por nombre o DNI de persona
    const { data: porPersona, error: errorPersona } = await this.db
      .from('personas')
      .select(`
        id,
        documentos_persona (
          *,
          usuarios (nombre_usuario),
          personas (nombre, dni)
        )
      `)
      .or(`nombre.ilike.%${termino}%,dni.ilike.%${termino}%`);

    if (errorPersona) throw errorPersona;

    // Combinar resultados
    const documentosPersona = (porPersona || [])
      .flatMap(p => (p.documentos_persona || []).map(d => ({
        ...d,
        usuario_carga_nombre: d.usuarios?.nombre_usuario,
        persona_nombre: d.personas?.nombre,
        persona_dni: d.personas?.dni
      })));

    // Formatear resultados directos
    const documentosDirectos = (data || []).map(d => ({
      ...d,
      usuario_carga_nombre: d.usuarios?.nombre_usuario,
      persona_nombre: d.personas?.nombre,
      persona_dni: d.personas?.dni
    }));

    // Combinar y eliminar duplicados por ID
    const todosDocumentos = [...documentosDirectos, ...documentosPersona];
    const documentosUnicos = Array.from(
      new Map(todosDocumentos.map(d => [d.id, d])).values()
    );

    // Ordenar por fecha de carga descendente
    return documentosUnicos.sort((a, b) =>
      new Date(b.fecha_carga) - new Date(a.fecha_carga)
    );
  }
}

module.exports = DocumentoPersonaModel;

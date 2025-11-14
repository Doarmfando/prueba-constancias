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
    const query = `
      SELECT
        d.*,
        u.nombre_usuario as usuario_carga_nombre,
        p.nombre as persona_nombre,
        p.dni as persona_dni
      FROM documentos_persona d
      LEFT JOIN usuarios u ON d.usuario_carga_id = u.id
      LEFT JOIN personas p ON d.persona_id = p.id
      WHERE
        d.nombre_archivo LIKE ? OR
        d.comentario LIKE ? OR
        p.nombre LIKE ? OR
        p.dni LIKE ?
      ORDER BY d.fecha_carga DESC
    `;

    const pattern = `%${termino}%`;
    return this.executeQuery(query, [pattern, pattern, pattern, pattern]);
  }
}

module.exports = DocumentoPersonaModel;

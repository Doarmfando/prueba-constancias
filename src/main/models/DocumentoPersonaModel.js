// src/main/models/DocumentoPersonaModel.js
const BaseModel = require('./BaseModel');

class DocumentoPersonaModel extends BaseModel {
  constructor(db) {
    super(db, 'documentos_persona');
  }

  // Crear documento
  async crear(datos) {
    const { persona_id, nombre_archivo, ruta_archivo, tipo_archivo, comentario, usuario_carga_id, tamaño_bytes } = datos;

    const query = `
      INSERT INTO documentos_persona
      (persona_id, nombre_archivo, ruta_archivo, tipo_archivo, comentario, fecha_carga, usuario_carga_id, tamaño_bytes)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `;

    const result = await this.executeRun(query, [
      persona_id,
      nombre_archivo,
      ruta_archivo,
      tipo_archivo || this.obtenerTipoArchivo(nombre_archivo),
      comentario || '',
      usuario_carga_id || null,
      tamaño_bytes || 0
    ]);

    return { id: result.lastID };
  }

  // Obtener documentos por persona_id
  async obtenerPorPersona(persona_id) {
    const query = `
      SELECT
        d.*,
        u.nombre_usuario as usuario_carga_nombre
      FROM documentos_persona d
      LEFT JOIN usuarios u ON d.usuario_carga_id = u.id
      WHERE d.persona_id = ?
      ORDER BY d.fecha_carga DESC
    `;

    return this.executeQuery(query, [persona_id]);
  }

  // Obtener documento por ID
  async obtenerPorId(id) {
    const query = `
      SELECT
        d.*,
        u.nombre_usuario as usuario_carga_nombre,
        p.nombre as persona_nombre,
        p.dni as persona_dni
      FROM documentos_persona d
      LEFT JOIN usuarios u ON d.usuario_carga_id = u.id
      LEFT JOIN personas p ON d.persona_id = p.id
      WHERE d.id = ?
    `;

    return this.executeGet(query, [id]);
  }

  // Eliminar documento
  async eliminar(id) {
    const query = 'DELETE FROM documentos_persona WHERE id = ?';
    return this.executeRun(query, [id]);
  }

  // Actualizar comentario
  async actualizarComentario(id, comentario) {
    const query = 'UPDATE documentos_persona SET comentario = ? WHERE id = ?';
    return this.executeRun(query, [comentario, id]);
  }

  // Contar documentos por persona
  async contarPorPersona(persona_id) {
    const query = 'SELECT COUNT(*) as total FROM documentos_persona WHERE persona_id = ?';
    const result = await this.executeGet(query, [persona_id]);
    return result ? result.total : 0;
  }

  // Obtener estadísticas de documentos
  async obtenerEstadisticas() {
    const query = `
      SELECT
        COUNT(*) as total_documentos,
        COUNT(DISTINCT persona_id) as personas_con_documentos,
        tipo_archivo,
        COUNT(*) as cantidad
      FROM documentos_persona
      GROUP BY tipo_archivo
    `;

    return this.executeQuery(query);
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

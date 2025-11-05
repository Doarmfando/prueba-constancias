const BaseModel = require('./BaseModel');
const crypto = require('crypto');

class UsuarioModel extends BaseModel {
  constructor(db) {
    super(db);
  }

  // Crear hash de password
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Verificar password
  verificarPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  // Crear nuevo usuario
  async crear(datos) {
    const { nombre, nombre_usuario, password, rol = 'trabajador' } = datos;
    const passwordHash = this.hashPassword(password);

    const sql = `
      INSERT INTO usuarios (nombre, nombre_usuario, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `;

    try {
      const result = await this.executeRun(sql, [nombre, nombre_usuario, passwordHash, rol]);
      return result.lastID;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('El nombre de usuario ya está en uso');
      }
      throw error;
    }
  }

  // Autenticar usuario
  async autenticar(nombre_usuario, password) {
    const sql = `
      SELECT id, nombre, nombre_usuario, email, rol, activo
      FROM usuarios
      WHERE nombre_usuario = ? AND activo = 1
    `;

    const usuario = await this.executeGet(sql, [nombre_usuario]);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    const sqlPassword = `SELECT password_hash FROM usuarios WHERE id = ?`;
    const result = await this.executeGet(sqlPassword, [usuario.id]);

    if (!this.verificarPassword(password, result.password_hash)) {
      throw new Error('Contraseña incorrecta');
    }

    // Actualizar último acceso
    await this.executeRun(
      `UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?`,
      [usuario.id]
    );

    return usuario;
  }

  // Obtener usuario por ID
  async obtenerPorId(id) {
    const sql = `
      SELECT id, nombre, nombre_usuario, email, rol, activo, fecha_creacion, ultimo_acceso
      FROM usuarios
      WHERE id = ?
    `;
    return await this.executeGet(sql, [id]);
  }

  // Listar todos los usuarios (solo admin)
  async listarTodos() {
    const sql = `
      SELECT id, nombre, nombre_usuario, email, rol, activo, fecha_creacion, ultimo_acceso
      FROM usuarios
      ORDER BY fecha_creacion DESC
    `;
    return await this.executeQuery(sql);
  }

  // Actualizar usuario
  async actualizar(id, datos) {
    const camposPermitidos = ['nombre', 'nombre_usuario', 'email', 'rol', 'activo'];
    const campos = [];
    const valores = [];

    for (const [key, value] of Object.entries(datos)) {
      if (camposPermitidos.includes(key)) {
        campos.push(`${key} = ?`);
        valores.push(value);
      }
    }

    if (campos.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    valores.push(id);
    const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;

    try {
      await this.executeRun(sql, valores);
      return await this.obtenerPorId(id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('El nombre de usuario ya está en uso');
      }
      throw error;
    }
  }

  // Cambiar contraseña
  async cambiarPassword(id, passwordAnterior, passwordNuevo) {
    const sqlPassword = `SELECT password_hash FROM usuarios WHERE id = ?`;
    const result = await this.executeGet(sqlPassword, [id]);

    if (!result) {
      throw new Error('Usuario no encontrado');
    }

    if (!this.verificarPassword(passwordAnterior, result.password_hash)) {
      throw new Error('Contraseña anterior incorrecta');
    }

    const nuevoHash = this.hashPassword(passwordNuevo);
    await this.executeRun(
      `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
      [nuevoHash, id]
    );

    return true;
  }

  // Desactivar usuario (eliminación lógica)
  async desactivar(id) {
    await this.executeRun(
      `UPDATE usuarios SET activo = 0 WHERE id = ?`,
      [id]
    );
    return true;
  }

  // Obtener estadísticas de usuarios
  async obtenerEstadisticas() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN rol = 'administrador' THEN 1 ELSE 0 END) as administradores,
        SUM(CASE WHEN rol = 'trabajador' THEN 1 ELSE 0 END) as trabajadores
      FROM usuarios
    `;
    return await this.executeGet(sql);
  }
}

module.exports = UsuarioModel;
const BaseModel = require('./BaseModel');
const crypto = require('crypto');

class UsuarioModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'usuarios');
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
    const { nombre, nombre_usuario, email, password, rol = 'trabajador' } = datos;
    const passwordHash = this.hashPassword(password);

    try {
      const nuevoUsuario = {
        nombre,
        nombre_usuario,
        email,
        password_hash: passwordHash,
        rol,
        activo: true
      };

      const usuario = await this.create(nuevoUsuario);
      return usuario.id;
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('El nombre de usuario ya está en uso');
      }
      throw error;
    }
  }

  // Autenticar usuario
  async autenticar(nombre_usuario, password) {
    try {
      // Buscar usuario activo por nombre_usuario
      const { data: usuarios, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('nombre_usuario', nombre_usuario)
        .eq('activo', true)
        .limit(1);

      if (error) throw error;

      if (!usuarios || usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = usuarios[0];

      // Verificar password
      if (!this.verificarPassword(password, usuario.password_hash)) {
        throw new Error('Contraseña incorrecta');
      }

      // Actualizar último acceso
      await this.db
        .from(this.tableName)
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', usuario.id);

      // Retornar usuario sin password_hash
      const { password_hash, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    } catch (error) {
      throw error;
    }
  }

  // Obtener usuario por ID
  async obtenerPorId(id) {
    const columnas = 'id, nombre, nombre_usuario, email, rol, activo, fecha_creacion, ultimo_acceso';
    return await this.getById(id, columnas);
  }

  // Listar todos los usuarios (solo admin)
  async listarTodos() {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('id, nombre, nombre_usuario, email, rol, activo, fecha_creacion, ultimo_acceso')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Actualizar usuario
  async actualizar(id, datos) {
    const camposPermitidos = ['nombre', 'nombre_usuario', 'email', 'rol', 'activo'];
    const datosActualizar = {};

    for (const [key, value] of Object.entries(datos)) {
      if (camposPermitidos.includes(key)) {
        datosActualizar[key] = value;
      }
    }

    if (Object.keys(datosActualizar).length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    try {
      await this.update(id, datosActualizar);
      return await this.obtenerPorId(id);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('El nombre de usuario ya está en uso');
      }
      throw error;
    }
  }

  // Cambiar contraseña
  async cambiarPassword(id, passwordAnterior, passwordNuevo) {
    const { data: usuario, error } = await this.db
      .from(this.tableName)
      .select('password_hash')
      .eq('id', id)
      .single();

    if (error || !usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (!this.verificarPassword(passwordAnterior, usuario.password_hash)) {
      throw new Error('Contraseña anterior incorrecta');
    }

    const nuevoHash = this.hashPassword(passwordNuevo);
    await this.update(id, { password_hash: nuevoHash });

    return true;
  }

  // Desactivar usuario (eliminación lógica)
  async desactivar(id) {
    await this.update(id, { activo: false });
    return true;
  }

  // Obtener estadísticas de usuarios
  async obtenerEstadisticas() {
    const { data: usuarios, error } = await this.db
      .from(this.tableName)
      .select('rol, activo');

    if (error) throw error;

    const stats = {
      total: usuarios.length,
      activos: usuarios.filter(u => u.activo).length,
      administradores: usuarios.filter(u => u.rol === 'administrador').length,
      trabajadores: usuarios.filter(u => u.rol === 'trabajador').length
    };

    return stats;
  }
}

module.exports = UsuarioModel;
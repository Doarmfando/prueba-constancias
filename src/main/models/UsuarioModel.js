const BaseModel = require('./BaseModel');

class UsuarioModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'usuarios');
  }

  // Crear nuevo usuario con Supabase Auth
  async crear(datos) {
    const { nombre, nombre_usuario, email, password, rol = 'trabajador' } = datos;

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await this.db.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            nombre_usuario,
            rol
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('El email ya está registrado');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Error al crear usuario en el sistema de autenticación');
      }

      // 2. El trigger en la BD ya creó el registro en la tabla usuarios
      // Esperamos un momento y obtenemos el usuario creado
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: usuario, error: userError } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo usuario creado:', userError);
        throw new Error('Usuario creado en Auth pero error obteniendo detalles');
      }

      return usuario.id;
    } catch (error) {
      console.error('Error en crear usuario:', error);
      throw error;
    }
  }

  // Autenticar usuario con Supabase Auth
  async autenticar(email, password) {
    try {
      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authError } = await this.db.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña incorrectos');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Error al iniciar sesión');
      }

      // 2. Obtener datos del usuario desde la tabla usuarios
      const { data: usuario, error: userError } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('auth_id', authData.user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuario) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // 3. Actualizar último acceso
      await this.db
        .from(this.tableName)
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('id', usuario.id);

      return usuario;
    } catch (error) {
      console.error('Error en autenticar:', error);
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

  // Cambiar contraseña usando Supabase Auth
  async cambiarPassword(id, passwordNuevo) {
    try {
      // Obtener el auth_id del usuario
      const { data: usuario, error: userError } = await this.db
        .from(this.tableName)
        .select('auth_id, email')
        .eq('id', id)
        .single();

      if (userError || !usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar la contraseña en Supabase Auth
      const { error: updateError } = await this.db.auth.admin.updateUserById(
        usuario.auth_id,
        { password: passwordNuevo }
      );

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      throw error;
    }
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
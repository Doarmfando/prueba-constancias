const BaseModel = require('./BaseModel');

class UsuarioModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'usuarios');
    // Guardar referencia al cliente admin para operaciones privilegiadas
    this.adminClient = null;
  }

  // Configurar cliente admin (se llama desde el controlador)
  setAdminClient(adminClient) {
    this.adminClient = adminClient;
  }

  // Crear nuevo usuario con Supabase Auth (requiere cliente admin)
  async crear(datos) {
    const { nombre, nombre_usuario, email, password, rol = 'trabajador' } = datos;

    try {
      if (!this.adminClient) {
        throw new Error('Cliente admin no configurado. Operación no permitida.');
      }

      // 1. Crear usuario en Supabase Auth usando cliente ADMIN
      const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          nombre,
          nombre_usuario,
          rol
        }
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
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

      const { data: usuario, error: userError } = await this.adminClient
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
  // Acepta email O nombre de usuario
  async autenticar(usernameOrEmail, password) {
    try {
      let email = usernameOrEmail;

      // 1. Si no es un email, buscar el email por nombre de usuario
      if (!usernameOrEmail.includes('@')) {
        const { data: userData, error: lookupError } = await this.db
          .from(this.tableName)
          .select('email')
          .eq('nombre_usuario', usernameOrEmail)
          .eq('activo', true)
          .single();

        if (lookupError || !userData) {
          throw new Error('Usuario no encontrado');
        }

        email = userData.email;
      }

      // 2. Autenticar con Supabase Auth usando el email
      const { data: authData, error: authError } = await this.db.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Error al iniciar sesión');
      }

      // 3. Obtener datos del usuario desde la tabla usuarios
      const { data: usuario, error: userError } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('auth_id', authData.user.id)
        .eq('activo', true)
        .single();

      if (userError || !usuario) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // 4. Actualizar último acceso
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

  // Cambiar contraseña del usuario autenticado (usuario normal)
  async cambiarPasswordPropia(passwordNuevo) {
    try {
      // Usa el cliente USER que tiene la sesión activa
      const { error: updateError } = await this.db.auth.updateUser({
        password: passwordNuevo
      });

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error al cambiar contraseña propia:', error);
      throw error;
    }
  }

  // Cambiar contraseña de otro usuario (solo admin)
  async cambiarPasswordAdmin(id, passwordNuevo) {
    try {
      if (!this.adminClient) {
        throw new Error('Cliente admin no configurado. Operación no permitida.');
      }

      // Obtener el auth_id del usuario
      const { data: usuario, error: userError } = await this.adminClient
        .from(this.tableName)
        .select('auth_id, email')
        .eq('id', id)
        .single();

      if (userError || !usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar la contraseña en Supabase Auth usando cliente ADMIN
      const { error: updateError } = await this.adminClient.auth.admin.updateUserById(
        usuario.auth_id,
        { password: passwordNuevo }
      );

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error al cambiar contraseña (admin):', error);
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
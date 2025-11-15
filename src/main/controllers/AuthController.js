const BaseController = require('./BaseController');

class AuthController extends BaseController {
  constructor(usuarioModel, auditoriaModel) {
    super();
    this.usuarioModel = usuarioModel;
    this.auditoriaModel = auditoriaModel;
  }

  // Iniciar sesión con Supabase Auth
  async login(email, password) {
    try {
      const usuario = await this.usuarioModel.autenticar(email, password);

      // Registrar acceso en auditoría
      await this.auditoriaModel.registrarAcceso(usuario.id);

      return {
        success: true,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          nombre_usuario: usuario.nombre_usuario,
          email: usuario.email,
          rol: usuario.rol,
          auth_id: usuario.auth_id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear nuevo usuario (solo admin)
  async crearUsuario(datosUsuario, usuarioActual) {
    try {
      // Verificar que el usuario actual sea admin
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para crear usuarios');
      }

      const nuevoUsuarioId = await this.usuarioModel.crear(datosUsuario);

      // Registrar acción en auditoría
      await this.auditoriaModel.registrarCreacion(
        usuarioActual.id,
        'usuarios',
        nuevoUsuarioId,
        null,
        { nombre_usuario: datosUsuario.nombre_usuario, rol: datosUsuario.rol }
      );

      const usuario = await this.usuarioModel.obtenerPorId(nuevoUsuarioId);

      return {
        success: true,
        usuario
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Listar usuarios (solo admin)
  async listarUsuarios(usuarioActual) {
    try {
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para ver la lista de usuarios');
      }

      const usuarios = await this.usuarioModel.listarTodos();

      return {
        success: true,
        usuarios
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar usuario
  async actualizarUsuario(id, datos, usuarioActual) {
    try {
      // Solo admin puede actualizar otros usuarios, o el usuario puede actualizarse a sí mismo
      const puedeActualizar = usuarioActual.rol === 'administrador' || usuarioActual.id === parseInt(id);

      if (!puedeActualizar) {
        throw new Error('No tienes permisos para actualizar este usuario');
      }

      // Si no es admin, no puede cambiar el rol
      if (usuarioActual.rol !== 'administrador' && datos.rol) {
        delete datos.rol;
      }

      const usuarioActualizado = await this.usuarioModel.actualizar(id, datos);

      // Registrar acción en auditoría
      await this.auditoriaModel.registrarEdicion(
        usuarioActual.id,
        'usuarios',
        id,
        null,
        datos
      );

      return {
        success: true,
        usuario: usuarioActualizado
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cambiar contraseña con Supabase Auth
  async cambiarPassword(id, passwordNuevo, usuarioActual) {
    try {
      // Solo admin puede cambiar passwords de otros, o el usuario puede cambiar la suya
      const puedeCambiar = usuarioActual.rol === 'administrador' || usuarioActual.id === parseInt(id);

      if (!puedeCambiar) {
        throw new Error('No tienes permisos para cambiar esta contraseña');
      }

      // Si el usuario cambia su propia contraseña
      if (usuarioActual.id === parseInt(id)) {
        await this.usuarioModel.cambiarPasswordPropia(passwordNuevo);
      }
      // Si es admin cambiando la contraseña de otro usuario
      else {
        await this.usuarioModel.cambiarPasswordAdmin(id, passwordNuevo);
      }

      // Registrar acción en auditoría
      await this.auditoriaModel.registrarEdicion(
        usuarioActual.id,
        'usuarios',
        id,
        null,
        { accion: 'cambio_password' }
      );

      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Desactivar usuario (solo admin)
  async desactivarUsuario(id, usuarioActual) {
    try {
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para desactivar usuarios');
      }

      if (usuarioActual.id === parseInt(id)) {
        throw new Error('No puedes desactivarte a ti mismo');
      }

      await this.usuarioModel.desactivar(id);

      // Registrar acción en auditoría
      await this.auditoriaModel.registrarEliminacion(
        usuarioActual.id,
        'usuarios',
        id,
        null,
        { accion: 'desactivacion' }
      );

      return {
        success: true,
        message: 'Usuario desactivado correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener perfil del usuario actual
  async obtenerPerfil(usuarioId) {
    try {
      const usuario = await this.usuarioModel.obtenerPorId(usuarioId);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      return {
        success: true,
        usuario
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estadísticas de usuarios (solo admin)
  async obtenerEstadisticas(usuarioActual) {
    try {
      if (usuarioActual.rol !== 'administrador') {
        throw new Error('No tienes permisos para ver estadísticas');
      }

      const estadisticas = await this.usuarioModel.obtenerEstadisticas();

      return {
        success: true,
        estadisticas
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar sesión
  async verificarSesion(usuarioId) {
    try {
      const usuario = await this.usuarioModel.obtenerPorId(usuarioId);

      if (!usuario || !usuario.activo) {
        throw new Error('Sesión inválida');
      }

      return {
        success: true,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          nombre_usuario: usuario.nombre_usuario,
          email: usuario.email || usuario.nombre_usuario,
          rol: usuario.rol
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AuthController;
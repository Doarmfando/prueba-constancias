const BaseController = require('./BaseController');

class PersonaController extends BaseController {
  constructor(personaModel) {
    super();
    this.personaModel = personaModel;
  }

  // Obtener todas las personas con sus documentos
  async obtenerConDocumentos() {
    try {
      const personas = await this.personaModel.obtenerConDocumentos();
      return {
        success: true,
        personas: personas || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Buscar personas
  async buscar(termino) {
    try {
      const personas = await this.personaModel.buscar(termino);
      return {
        success: true,
        personas: personas || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear nueva persona
  async crear(datos) {
    try {
      this.validateRequired(datos, ['dni', 'nombre']);

      const { dni, nombre, numero } = datos;

      // Verificar si ya existe una persona con ese DNI
      const personaExistente = await this.personaModel.buscarPorDni(dni);
      if (personaExistente) {
        throw new Error('Ya existe una persona con ese DNI');
      }

      const result = await this.personaModel.crear(nombre, dni, numero);

      return {
        success: true,
        persona: {
          id: result.lastID,
          dni,
          nombre,
          numero
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar persona
  async actualizar(datos) {
    try {
      this.validateRequired(datos, ['id', 'dni', 'nombre']);

      const { id, dni, nombre, numero } = datos;

      // Verificar si el DNI ya existe en otra persona
      const personaExistente = await this.personaModel.buscarPorDni(dni);
      if (personaExistente && personaExistente.id !== parseInt(id)) {
        throw new Error('Ya existe otra persona con ese DNI');
      }

      await this.personaModel.actualizar(id, { dni, nombre, numero });

      return {
        success: true,
        persona: {
          id,
          dni,
          nombre,
          numero
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar persona
  async eliminar(payload) {
    try {
      // Compatibilidad: aceptar id directo o { id, usuario }
      const id = typeof payload === 'object' ? payload.id : payload;
      const usuario = typeof payload === 'object' ? payload.usuario : null;

      this.validateRequired({ id }, ['id']);

      // Validar rol administrador
      if (!usuario || usuario.rol !== 'administrador') {
        throw new Error('Solo administradores pueden eliminar personas');
      }

      // Verificar si tiene registros asociados
      const tieneRegistros = await this.personaModel.tieneRegistros(id);
      if (tieneRegistros) {
        throw new Error('No se puede eliminar esta persona porque tiene registros asociados');
      }

      await this.personaModel.eliminar(id);

      return {
        success: true,
        message: 'Persona eliminada correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PersonaController;

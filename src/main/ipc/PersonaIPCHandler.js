const BaseIPCHandler = require('./BaseIPCHandler');

class PersonaIPCHandler extends BaseIPCHandler {
  constructor(personaController) {
    super();
    this.personaController = personaController;
    this.registerHandlers();
  }

  registerHandlers() {
    // Operaciones de consulta
    this.handle("personas-obtener-con-documentos", this.personaController, "obtenerConDocumentos");
    this.handle("personas-buscar", this.personaController, "buscar");

    // Operaciones CRUD
    this.handle("personas-crear", this.personaController, "crear");
    this.handle("personas-actualizar", this.personaController, "actualizar");
    this.handle("personas-eliminar", this.personaController, "eliminar");

    console.log("✅ Handlers de Persona registrados");
  }
}

module.exports = PersonaIPCHandler;

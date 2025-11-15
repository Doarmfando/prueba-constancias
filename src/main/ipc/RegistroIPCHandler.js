// src/main/ipc/RegistroIPCHandler.js
const BaseIPCHandler = require('./BaseIPCHandler');

class RegistroIPCHandler extends BaseIPCHandler {
  constructor(registroController) {
    super();
    this.registroController = registroController;
  }

  registerHandlers() {
    // Operaciones básicas CRUD
    this.handle("obtener-registros", this.registroController, "obtenerRegistros");
    this.handle("obtener-registros-borrados", this.registroController, "obtenerPapeleria");
    this.handle("obtener-registros-proyecto", this.registroController, "obtenerRegistrosPorProyecto");
    this.handle("agregar-registro", this.registroController, "agregarRegistro");
    this.handle("actualizar-registro", this.registroController, "actualizarRegistro");
    this.handle("cambiar-estado-registro", this.registroController, "cambiarEstado");

    // Operaciones de papelera
    this.handle("mover-a-papelera", this.registroController, "moverAPapelera");
    this.handle("mover-a-papelera-multiple", this.registroController, "moverMultipleAPapelera");
    this.handle("restaurar-registro", this.registroController, "restaurarRegistro");
    this.handle("restaurar-registro-multiple", this.registroController, "restaurarMultiple");

    // Eliminación permanente
    this.handle("eliminarRegistro", this.registroController, "eliminarPermanentemente");
    this.handle("eliminar-registro-multiple", this.registroController, "eliminarMultiple");

    // Búsquedas y operaciones especiales
    this.handle("buscar-por-dni", this.registroController, "buscarPorDni");
    this.handle("mover-a-papelera-dni-completo", this.registroController, "moverDniCompletoAPapelera");

    // Operaciones masivas - DESHABILITADO para evitar borrado accidental
    // this.handle("vaciar-registros", this.registroController, "vaciarTodos");

    // Dashboard y estadísticas
    this.handle("dashboard-estadisticas", this.registroController, "obtenerEstadisticas");
    this.handle("fechas-disponibles", this.registroController, "obtenerFechasDisponibles");

    console.log("✅ Handlers de Registro registrados");
  }

  // Métodos auxiliares para validaciones específicas

  // Wrapper para agregar registro con validaciones adicionales
  async agregarRegistroValidado(datos) {
    try {
      // Validaciones específicas del frontend
      if (!datos) {
        throw new Error("No se proporcionaron datos para el registro");
      }

      // Llamar al controller
      const resultado = await this.registroController.agregarRegistro(datos);
      
      return {
        success: true,
        data: resultado,
        message: resultado.advertencia || "Registro agregado correctamente"
      };
    } catch (error) {
      console.error("Error en agregarRegistroValidado:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Wrapper para actualizar con validaciones específicas
  async actualizarRegistroValidado(datos) {
    try {
      if (!datos?.id) {
        throw new Error("ID de registro requerido para actualización");
      }

      const resultado = await this.registroController.actualizarRegistro(datos);
      
      return {
        success: true,
        data: resultado,
        message: "Registro actualizado correctamente"
      };
    } catch (error) {
      console.error("Error en actualizarRegistroValidado:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Wrapper para estadísticas con formato específico
  async obtenerEstadisticasFormateadas(params) {
    try {
      const resultado = await this.registroController.obtenerEstadisticas(params);
      
      // Asegurar formato consistente para el frontend
      return {
        success: true,
        total: resultado.total || 0,
        Recibido: resultado.Recibido || 0,
        "En Caja": resultado["En Caja"] || 0,
        Entregado: resultado.Entregado || 0,
        Tesoreria: resultado.Tesoreria || 0
      };
    } catch (error) {
      console.error("Error en obtenerEstadisticasFormateadas:", error);
      return {
        success: false,
        total: 0,
        Recibido: 0,
        "En Caja": 0,
        Entregado: 0,
        Tesoreria: 0
      };
    }
  }

  // Registrar handlers con validaciones adicionales
  registerValidatedHandlers() {
    this.handle("agregar-registro-validado", this, "agregarRegistroValidado");
    this.handle("actualizar-registro-validado", this, "actualizarRegistroValidado");
    this.handle("dashboard-estadisticas-formateadas", this, "obtenerEstadisticasFormateadas");
    
    console.log("✅ Handlers validados de Registro registrados");
  }
}

module.exports = RegistroIPCHandler;
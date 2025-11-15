// src/main/controllers/ExcelController.js
const BaseController = require('./BaseController');

class ExcelController extends BaseController {
  constructor(excelService, fileService, models) {
    super(null); // No necesita modelo específico
    this.excelService = excelService;
    this.fileService = fileService;

    // Configurar modelos en el ExcelService
    this.excelService.setModels(models);
  }

  // Exportar base de datos completa a Excel
  async exportarRegistros() {
    try {
      // Solicitar ruta de guardado
      const rutaResult = await this.fileService.seleccionarRutaGuardado("base_completa.xlsx");

      if (!rutaResult.success) {
        return { success: false, message: "Exportación cancelada" };
      }

      // Realizar exportación
      const resultado = await this.excelService.exportarBaseDatos(rutaResult.filePath);

      if (resultado.success) {
        return {
          success: true,
          filePath: resultado.filePath,
          message: "Base de datos exportada correctamente"
        };
      } else {
        throw new Error("Error durante la exportación");
      }
    } catch (error) {
      this.handleError(error, "Error al exportar registros");
    }
  }

  // Importar registros desde Excel
  async importarRegistros() {
    try {
      // Solicitar archivo de importación
      const archivoResult = await this.fileService.seleccionarArchivoExcel();

      if (!archivoResult.success) {
        return { success: false, message: "Importación cancelada" };
      }

      // Realizar importación
      const resultado = await this.excelService.importarDesdeExcel(archivoResult.filePath);
      
      return {
        ...resultado,
        message: this.generarMensajeImportacion(resultado)
      };
    } catch (error) {
      this.handleError(error, "Error al importar registros");
    }
  }

  // Validar formato de archivo Excel antes de importar
  async validarArchivoExcel(filePath) {
    try {
      const XLSX = require("xlsx");
      
      if (!this.fileService.existeArchivo(filePath)) {
        throw new Error("El archivo no existe");
      }

      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const hojasRequeridas = ["personas", "expedientes", "registros"];

      const hojasFaltantes = hojasRequeridas.filter(hoja => !sheetNames.includes(hoja));
      
      if (hojasFaltantes.length > 0) {
        return {
          valido: false,
          error: `Faltan las hojas requeridas: ${hojasFaltantes.join(", ")}`,
          hojasEncontradas: sheetNames,
          hojasRequeridas
        };
      }

      // Validar que las hojas tengan datos
      const validacionDatos = {};
      for (const hoja of hojasRequeridas) {
        const datos = XLSX.utils.sheet_to_json(workbook.Sheets[hoja]);
        validacionDatos[hoja] = {
          filas: datos.length,
          vacia: datos.length === 0
        };
      }

      return {
        valido: true,
        validacionDatos,
        mensaje: "Archivo válido para importación"
      };
    } catch (error) {
      return {
        valido: false,
        error: error.message
      };
    }
  }

  // Obtener vista previa de datos del Excel
  async obtenerVistaPrevia(filePath, limite = 5) {
    try {
      const XLSX = require("xlsx");
      
      const workbook = XLSX.readFile(filePath);
      const preview = {};

      const hojas = ["personas", "expedientes", "registros"];
      
      for (const hoja of hojas) {
        if (workbook.SheetNames.includes(hoja)) {
          const datos = XLSX.utils.sheet_to_json(workbook.Sheets[hoja]);
          preview[hoja] = {
            total: datos.length,
            muestra: datos.slice(0, limite),
            columnas: datos.length > 0 ? Object.keys(datos[0]) : []
          };
        }
      }

      return {
        success: true,
        preview,
        totalRegistros: preview.registros?.total || 0
      };
    } catch (error) {
      this.handleError(error, "Error obteniendo vista previa");
    }
  }

  // Limpiar datos de importación (formato consistente)
  async limpiarDatosImportacion(filePath) {
    try {
      const XLSX = require("xlsx");
      
      const workbook = XLSX.readFile(filePath);
      const datosLimpios = {};

      // Limpiar cada hoja
      const hojas = ["personas", "expedientes", "registros"];
      
      for (const hoja of hojas) {
        if (workbook.SheetNames.includes(hoja)) {
          const datos = XLSX.utils.sheet_to_json(workbook.Sheets[hoja], { defval: "" });
          datosLimpios[hoja] = datos.map(row => this.limpiarFilaExcel(row, hoja));
        }
      }

      return datosLimpios;
    } catch (error) {
      this.handleError(error, "Error limpiando datos");
    }
  }

  // Métodos auxiliares privados

  generarMensajeImportacion(resultado) {
    if (!resultado.success) {
      return "Error en la importación";
    }

    const { total, ignorados } = resultado;
    let mensaje = `Importación completada: ${total} registros importados`;
    
    if (ignorados > 0) {
      mensaje += `, ${ignorados} registros ignorados`;
    }

    return mensaje;
  }

  limpiarFilaExcel(row, tipoHoja) {
    const cleaned = {};
    
    switch (tipoHoja) {
      case "registros":
        cleaned.Nombre = this.limpiarTexto(row.Nombre);
        cleaned.Número = this.limpiarTexto(row.Número || row.Numero);
        cleaned.DNI = this.limpiarTexto(row.DNI);
        cleaned.Expediente = this.limpiarTexto(row.Expediente);
        cleaned.Estado = this.limpiarTexto(row.Estado) || "Recibido";
        cleaned["Fecha de Registro"] = row["Fecha de Registro"];
        cleaned["Fecha en Caja"] = row["Fecha en Caja"];
        break;
        
      case "personas":
        cleaned.Nombre = this.limpiarTexto(row.Nombre);
        cleaned.DNI = this.limpiarTexto(row.DNI);
        cleaned.Número = this.limpiarTexto(row.Número || row.Numero);
        break;
        
      case "expedientes":
        cleaned.Código = this.limpiarTexto(row.Código || row.Codigo);
        cleaned["Fecha de Solicitud"] = row["Fecha de Solicitud"];
        cleaned["Fecha de Entrega"] = row["Fecha de Entrega"];
        cleaned.Observación = this.limpiarTexto(row.Observación || row.Observacion);
        break;
    }

    return cleaned;
  }

  limpiarTexto(texto) {
    if (!texto) return "";
    return String(texto).trim();
  }

  // Generar plantilla Excel vacía
  async generarPlantilla() {
    try {
      const XLSX = require("xlsx");
      
      // Crear workbook vacío con las hojas requeridas
      const workbook = XLSX.utils.book_new();

      // Definir estructuras de las hojas
      const estructuras = {
        personas: [
          { "Persona_ID": "", "Nombre": "", "DNI": "", "Número": "" }
        ],
        expedientes: [
          { 
            "Expediente_ID": "", 
            "Persona_ID": "", 
            "Código": "", 
            "Fecha de Solicitud": "", 
            "Fecha de Entrega": "", 
            "Observación": "" 
          }
        ],
        registros: [
          { 
            "Registro_ID": "", 
            "Nombre": "", 
            "Número": "", 
            "DNI": "", 
            "Expediente": "", 
            "Fecha de Registro": "", 
            "Estado": "", 
            "Fecha en Caja": "", 
            "Eliminado": "" 
          }
        ]
      };

      // Crear hojas
      for (const [nombreHoja, estructura] of Object.entries(estructuras)) {
        const worksheet = XLSX.utils.json_to_sheet(estructura);
        XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
      }

      // Solicitar ubicación de guardado
      const rutaResult = await this.fileService.seleccionarRutaGuardado("plantilla_importacion.xlsx");
      
      if (!rutaResult.success) {
        return { success: false, message: "Generación de plantilla cancelada" };
      }

      // Guardar archivo
      XLSX.writeFile(workbook, rutaResult.filePath);

      return {
        success: true,
        filePath: rutaResult.filePath,
        message: "Plantilla generada correctamente"
      };
    } catch (error) {
      this.handleError(error, "Error generando plantilla");
    }
  }
}

module.exports = ExcelController;
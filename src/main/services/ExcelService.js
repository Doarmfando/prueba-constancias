// src/main/services/ExcelService.js
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");

class ExcelService {
  constructor() {
    this.requiredSheets = ["personas", "expedientes", "registros"];
    // Modelos se inyectarán desde el controlador
    this.personaModel = null;
    this.expedienteModel = null;
    this.registroModel = null;
    this.estadoModel = null;
  }

  // Configurar modelos (se llama desde ExcelController)
  setModels(models) {
    this.personaModel = models.persona;
    this.expedienteModel = models.expediente;
    this.registroModel = models.registro;
    this.estadoModel = models.estado;
  }

  // Exportar base de datos completa a Excel
  async exportarBaseDatos(filePath) {
    if (!this.registroModel) {
      throw new Error('Modelos no configurados. Llama a setModels() primero.');
    }

    const workbook = XLSX.utils.book_new();

    // REGISTROS con JOINs
    const { data: registros } = await this.registroModel.db
      .from('registros')
      .select(`
        id,
        personas!inner (nombre, numero, dni),
        expedientes!inner (codigo),
        estados!inner (nombre),
        fecha_registro,
        fecha_en_caja,
        eliminado
      `)
      .order('id', { ascending: true });

    const registrosFormateados = (registros || []).map(r => ({
      'Registro_ID': r.id,
      'Nombre': r.personas?.nombre,
      'Número': r.personas?.numero,
      'DNI': r.personas?.dni,
      'Expediente': r.expedientes?.codigo,
      'Fecha de Registro': r.fecha_registro,
      'Estado': r.estados?.nombre,
      'Fecha en Caja': r.fecha_en_caja || 'No entregado',
      'Eliminado': r.eliminado ? 1 : 0
    }));

    // PERSONAS
    const { data: personas } = await this.personaModel.db
      .from('personas')
      .select('id, nombre, dni, numero')
      .order('id', { ascending: true });

    const personasFormateadas = (personas || []).map(p => ({
      'Persona_ID': p.id,
      'Nombre': p.nombre,
      'DNI': p.dni,
      'Número': p.numero
    }));

    // EXPEDIENTES
    const { data: expedientes } = await this.expedienteModel.db
      .from('expedientes')
      .select('id, persona_id, codigo, fecha_solicitud, fecha_entrega, observacion')
      .order('id', { ascending: true });

    const expedientesFormateados = (expedientes || []).map(e => ({
      'Expediente_ID': e.id,
      'Persona_ID': e.persona_id,
      'Código': e.codigo,
      'Fecha de Solicitud': e.fecha_solicitud,
      'Fecha de Entrega': e.fecha_entrega,
      'Observación': e.observacion
    }));

    // ESTADOS
    const { data: estados } = await this.estadoModel.db
      .from('estados')
      .select('id, nombre')
      .order('id', { ascending: true });

    const estadosFormateados = (estados || []).map(e => ({
      'Estado_ID': e.id,
      'Nombre': e.nombre
    }));

    // Crear hojas
    const wsRegistros = XLSX.utils.json_to_sheet(registrosFormateados);
    const wsPersonas = XLSX.utils.json_to_sheet(personasFormateadas);
    const wsExpedientes = XLSX.utils.json_to_sheet(expedientesFormateados);
    const wsEstados = XLSX.utils.json_to_sheet(estadosFormateados);

    XLSX.utils.book_append_sheet(workbook, wsRegistros, 'registros');
    XLSX.utils.book_append_sheet(workbook, wsPersonas, 'personas');
    XLSX.utils.book_append_sheet(workbook, wsExpedientes, 'expedientes');
    XLSX.utils.book_append_sheet(workbook, wsEstados, 'estados');

    XLSX.writeFile(workbook, filePath);
    return { success: true, filePath };
  }

  // Importar desde Excel
  async importarDesdeExcel(filePath) {
    if (!this.registroModel) {
      throw new Error('Modelos no configurados. Llama a setModels() primero.');
    }

    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    // Validar hojas requeridas
    const hojasFaltantes = this.requiredSheets.filter(hoja => !sheetNames.includes(hoja));
    if (hojasFaltantes.length > 0) {
      throw new Error(`Faltan las hojas: ${hojasFaltantes.join(", ")}`);
    }

    // Leer datos de las hojas
    const datos = {};
    for (const hoja of this.requiredSheets) {
      datos[hoja] = XLSX.utils.sheet_to_json(workbook.Sheets[hoja], { defval: "" });
    }

    // Procesar importación
    const resultado = await this.procesarImportacion(datos);

    // Guardar log
    const logFile = await this.crearArchivoLog(resultado, filePath);

    return {
      ...resultado,
      logFile
    };
  }

  async procesarImportacion(datos) {
    const logs = [];
    const ignorados = [];
    let totalImportados = 0;

    for (let i = 0; i < datos.registros.length; i++) {
      const row = datos.registros[i];
      const fila = i + 2;

      try {
        const registroData = this.prepararDatosRegistro(row, datos.expedientes);

        // Validaciones
        if (!this.validarRegistro(registroData, fila, logs, ignorados)) {
          continue;
        }

        // Verificar duplicados
        if (await this.verificarDuplicados(registroData, fila, logs, ignorados)) {
          continue;
        }

        // Insertar registro completo
        await this.insertarRegistroCompleto(registroData);
        totalImportados++;

      } catch (error) {
        logs.push(`Error fila ${fila}: ${error.message}`);
        ignorados.push(fila);
      }
    }

    return {
      success: true,
      total: totalImportados,
      ignorados: ignorados.length,
      filasIgnoradas: ignorados,
      log: this.generarResumen(datos.registros.length, totalImportados, ignorados, logs)
    };
  }

  prepararDatosRegistro(row, expedientes) {
    const nombre = String(row.Nombre ?? "").trim() || "---";
    const numero = String(row.Número ?? "").trim() || "---";
    const dni = String(row.DNI ?? "").trim() || "---";
    let expediente = String(row.Expediente ?? "").trim();
    const estado = String(row.Estado ?? "").trim() || "Recibido";

    const fecha_registro = this.convertirFechaExcel(row["Fecha de Registro"]) || this.getFechaLocal();
    const fecha_en_caja = this.convertirFechaExcel(row["Fecha en Caja"]) || "No entregado";

    if (!expediente || expediente === "---") expediente = null;

    // Buscar información adicional del expediente
    const expInfo = expedientes.find(e => String(e.Código ?? "").trim() === (expediente ?? ""));
    const fecha_solicitud = this.convertirFechaExcel(expInfo?.["Fecha de Solicitud"]) || null;
    const fecha_entrega = this.convertirFechaExcel(expInfo?.["Fecha de Entrega"]) || null;
    const observacion = String(expInfo?.Observación ?? "").trim() || null;

    const final_fecha_entrega = estado === "Entregado" && !fecha_entrega ? this.getFechaLocal() : fecha_entrega;

    return {
      nombre, numero, dni, expediente, estado,
      fecha_registro, fecha_en_caja,
      fecha_solicitud, observacion,
      fecha_entrega: final_fecha_entrega
    };
  }

  validarRegistro(data, fila, logs, ignorados) {
    if (data.dni !== "---" && !/^\d{8}$/.test(data.dni)) {
      logs.push(`Fila ${fila}: DNI inválido (${data.dni}), registro ignorado.`);
      ignorados.push(fila);
      return false;
    }
    return true;
  }

  async verificarDuplicados(data, fila, logs, ignorados) {
    if (data.expediente) {
      const { data: existe } = await this.expedienteModel.db
        .from('expedientes')
        .select('id')
        .eq('codigo', data.expediente)
        .limit(1);

      if (existe && existe.length > 0) {
        logs.push(`Fila ${fila}: expediente duplicado (${data.expediente}), registro ignorado.`);
        ignorados.push(fila);
        return true;
      }
    }
    return false;
  }

  convertirFechaExcel(valor) {
    if (!valor || (typeof valor === "string" && valor.trim().toLowerCase() === "no entregado")) {
      return null;
    }

    if (typeof valor === "number") {
      const fecha = XLSX.SSF.parse_date_code(valor);
      if (!fecha) return null;
      return dayjs(new Date(fecha.y, fecha.m - 1, fecha.d)).format("YYYY-MM-DD");
    }

    if (typeof valor === "string") {
      const formatos = [
        "DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "MM/DD/YYYY",
        "DD-MM-YYYY", "D-M-YYYY", "YYYY/MM/DD"
      ];

      const limpio = valor.replace(/\s/g, "").trim();

      for (const formato of formatos) {
        const fecha = dayjs(limpio, formato, true);
        if (fecha.isValid()) return fecha.format("YYYY-MM-DD");
      }
    }

    return null;
  }

  getFechaLocal() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${año}-${mes}-${dia}`;
  }

  getFechaHoraArchivo() {
    const hoy = new Date();
    const fecha = this.getFechaLocal();
    const hora = `${String(hoy.getHours()).padStart(2, "0")}${String(hoy.getMinutes()).padStart(2, "0")}${String(hoy.getSeconds()).padStart(2, "0")}`;
    return `${fecha}-${hora}`;
  }

  async crearArchivoLog(resultado, filePath) {
    const logNombre = `import_log-${this.getFechaHoraArchivo()}.txt`;
    const logRuta = path.join(path.dirname(filePath), logNombre);
    fs.writeFileSync(logRuta, resultado.log.join("\n"), "utf8");
    return logRuta;
  }

  generarResumen(totalProcesados, totalImportados, ignorados, logs) {
    const resumen = [
      ...logs,
      `Total registros procesados: ${totalProcesados}`,
      `Total importados correctamente: ${totalImportados}`,
      `Total ignorados: ${ignorados.length}`
    ];
    
    if (ignorados.length) {
      resumen.push(`Filas ignoradas: ${ignorados.join(', ')}`);
    }

    return resumen;
  }

  async insertarRegistroCompleto(data) {
    // 1. Buscar o crear persona
    let persona = await this.personaModel.buscarPorDni(data.dni);

    if (!persona) {
      const { lastID } = await this.personaModel.crear(data.nombre, data.dni, data.numero);
      persona = await this.personaModel.buscarPorId(lastID);
    } else {
      // Actualizar número si cambió
      if (data.numero && data.numero !== '---' && data.numero !== persona.numero) {
        await this.personaModel.actualizar(persona.id, { numero: data.numero });
      }
    }

    // 2. Crear expediente
    let expedienteId = null;
    if (data.expediente && data.expediente !== '---') {
      const { lastID } = await this.expedienteModel.crear({
        persona_id: persona.id,
        codigo: data.expediente,
        fecha_solicitud: data.fecha_solicitud,
        fecha_entrega: data.fecha_entrega,
        observacion: data.observacion
      });
      expedienteId = lastID;
    } else {
      // Crear expediente sin código
      const { lastID } = await this.expedienteModel.crear({
        persona_id: persona.id,
        codigo: null,
        fecha_solicitud: data.fecha_solicitud,
        fecha_entrega: data.fecha_entrega,
        observacion: data.observacion
      });
      expedienteId = lastID;
    }

    // 3. Buscar estado
    const { data: estados } = await this.estadoModel.db
      .from('estados')
      .select('id')
      .eq('nombre', data.estado)
      .single();

    const estadoId = estados?.id || 1; // Default: 1 (Recibido)

    // 4. Crear registro
    await this.registroModel.crear({
      proyecto_id: 1, // Proyecto por defecto
      persona_id: persona.id,
      expediente_id: expedienteId,
      estado_id: estadoId,
      usuario_creador_id: 1, // Usuario por defecto
      fecha_en_caja: data.fecha_en_caja === 'No entregado' ? null : data.fecha_en_caja
    });
  }
}

module.exports = ExcelService;
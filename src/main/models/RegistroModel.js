// src/main/models/RegistroModel.js
const BaseModel = require('./BaseModel');

class RegistroModel extends BaseModel {
  // Obtener todos los registros activos por proyecto
  async obtenerTodos(proyectoId = null) {
    let whereClause = 'WHERE r.eliminado = 0';
    let params = [];

    if (proyectoId) {
      whereClause += ' AND r.proyecto_id = ?';
      params.push(proyectoId);
    }

    return this.executeQuery(`
      SELECT
        r.id,
        r.persona_id,
        r.expediente_id,
        r.estado_id,
        r.proyecto_id,
        r.usuario_creador_id,
        p.nombre,
        p.numero,
        p.dni,
        e.codigo AS expediente,
        r.fecha_registro,
        s.nombre AS estado,
        r.fecha_en_caja,
        u.nombre AS creado_por
      FROM registros r
      LEFT JOIN personas p ON r.persona_id = p.id
      LEFT JOIN expedientes e ON r.expediente_id = e.id
      LEFT JOIN estados s ON r.estado_id = s.id
      LEFT JOIN usuarios u ON r.usuario_creador_id = u.id
      ${whereClause}
      ORDER BY r.id ASC
    `, params);
  }

  // Obtener registros en papelera por proyecto
  async obtenerEliminados(proyectoId = null) {
    let whereClause = 'WHERE r.eliminado = 1';
    let params = [];

    if (proyectoId) {
      whereClause += ' AND r.proyecto_id = ?';
      params.push(proyectoId);
    }

    return this.executeQuery(`
      SELECT
        r.id,
        r.proyecto_id,
        p.nombre,
        p.numero,
        p.dni,
        e.codigo AS expediente,
        r.fecha_registro,
        s.nombre AS estado,
        r.fecha_en_caja,
        u.nombre AS creado_por
      FROM registros r
      JOIN personas p ON r.persona_id = p.id
      LEFT JOIN expedientes e ON r.expediente_id = e.id
      JOIN estados s ON r.estado_id = s.id
      LEFT JOIN usuarios u ON r.usuario_creador_id = u.id
      ${whereClause}
      ORDER BY r.id ASC
    `, params);
  }

  // Agregar nuevo registro (transacción completa)
  async agregar(registroData) {
    const { nombre, numero, dni, expediente, estado, fecha_registro, fecha_en_caja, proyecto_id, usuario_creador_id, persona_existente_id } = registroData;

    // Validaciones
    this.validarCampos(registroData);
    await this.validarExpedienteDuplicado(expediente);

    const fechaEntrega = estado === "Entregado" ? this.getFechaLocal() : null;

    return this.executeTransaction([
      async () => {
        try {
          let personaId;

          // Si se proporcionó persona_existente_id, usarla
          if (persona_existente_id) {
            personaId = persona_existente_id;
            console.log(`♻️ Reutilizando persona existente con ID: ${personaId}`);
          } else {
            // Verificar si ya existe una persona con este DNI
            const personaExistente = await this.executeGet(
              `SELECT id, nombre, numero FROM personas WHERE dni = ?`,
              [dni]
            );

            if (personaExistente) {
              personaId = personaExistente.id;
              console.log(`♻️ Persona con DNI ${dni} ya existe (ID: ${personaId}), reutilizando...`);

              // Opcional: Actualizar datos si son diferentes
              if (personaExistente.nombre !== nombre || personaExistente.numero !== numero) {
                console.log(`⚠️ Datos diferentes detectados. Actualizando persona ID ${personaId}...`);
                await this.executeRun(
                  `UPDATE personas SET nombre = ?, numero = ? WHERE id = ?`,
                  [nombre, numero, personaId]
                );
              }
            } else {
              // Insertar nueva persona
              const personaResult = await this.executeRun(
                `INSERT INTO personas (nombre, dni, numero) VALUES (?, ?, ?)`,
                [nombre, dni, numero]
              );
              personaId = personaResult.lastID;
              console.log(`✨ Nueva persona creada con ID: ${personaId}`);
            }
          }

          // Insertar expediente
          const expedienteResult = await this.executeRun(
            `INSERT INTO expedientes (persona_id, codigo, fecha_entrega) VALUES (?, NULLIF(?, ''), ?)`,
            [personaId, expediente, fechaEntrega]
          );

          // Obtener estado_id
          const estadoRow = await this.executeGet(
            `SELECT id FROM estados WHERE nombre = ?`,
            [estado]
          );

          if (!estadoRow) {
            throw new Error("Estado inválido");
          }

          // Insertar registro
          const registroResult = await this.executeRun(
            `INSERT INTO registros (
              proyecto_id, persona_id, expediente_id, estado_id, usuario_creador_id, fecha_registro, fecha_en_caja, eliminado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [proyecto_id, personaId, expedienteResult.lastID, estadoRow.id, usuario_creador_id, fecha_registro, fecha_en_caja]
          );

          return {
            id: registroResult.lastID,
            persona_id: personaId,
            expediente_id: expedienteResult.lastID,
            estado_id: estadoRow.id,
            nombre,
            numero,
            dni,
            expediente: expediente || "---",
            estado,
            fecha_registro,
            fecha_en_caja,
          };
        } catch (error) {
          throw error;
        }
      }
    ]);
  }

  // Actualizar registro existente
  async actualizar(registro) {
    const { id, nombre, numero, dni, expediente, estado, fecha_registro, fecha_en_caja } = registro;
    
    if (!id) {
      throw new Error("Registro inválido o incompleto");
    }

    let estadoFinal = (estado || "Recibido").trim();
    let fechaEnCaja = this.calcularFechaEnCaja(estadoFinal, fecha_en_caja);

    return this.executeTransaction([
      async () => {
        // Actualizar persona
        await this.executeRun(
          `UPDATE personas SET nombre = ?, numero = ?, dni = ? WHERE id = ?`,
          [nombre, numero, dni, registro.persona_id]
        );

        // Actualizar expediente
        await this.executeRun(
          `UPDATE expedientes SET codigo = NULLIF(?, '') WHERE id = ?`,
          [expediente, registro.expediente_id]
        );

        // Obtener estado_id
        const estadoRow = await this.executeGet(
          `SELECT id FROM estados WHERE nombre = ?`,
          [estadoFinal]
        );

        if (!estadoRow) {
          throw new Error("Estado inválido");
        }

        // Actualizar fecha_entrega si es "Entregado"
        if (estadoFinal === "Entregado") {
          const expedienteActual = await this.executeGet(
            `SELECT fecha_entrega FROM expedientes WHERE id = ?`,
            [registro.expediente_id]
          );
          
          if (!expedienteActual.fecha_entrega) {
            await this.executeRun(
              `UPDATE expedientes SET fecha_entrega = ? WHERE id = ?`,
              [this.getFechaLocal(), registro.expediente_id]
            );
          }
        } else {
          await this.executeRun(
            `UPDATE expedientes SET fecha_entrega = NULL WHERE id = ?`,
            [registro.expediente_id]
          );
        }

        // Actualizar registro
        await this.executeRun(
          `UPDATE registros SET estado_id = ?, fecha_registro = ?, fecha_en_caja = ? WHERE id = ?`,
          [estadoRow.id, fecha_registro, fechaEnCaja, id]
        );

        return {
          ...registro,
          nombre,
          numero,
          dni,
          expediente,
          estado: estadoFinal,
          fecha_registro,
          fecha_en_caja: fechaEnCaja,
          estado_id: estadoRow.id
        };
      }
    ]);
  }

  // Mover a papelera
  async moverAPapelera(id) {
    const result = await this.executeRun(
      `UPDATE registros SET eliminado = 1 WHERE id = ?`,
      [id]
    );

    if (result.changes === 0) {
      throw new Error("El registro no existe o ya fue eliminado");
    }

    return { success: true };
  }

  // Mover múltiples a papelera
  async moverMultipleAPapelera(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("No se proporcionaron IDs válidos");
    }

    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.executeRun(
      `UPDATE registros SET eliminado = 1 WHERE id IN (${placeholders})`,
      ids
    );

    return { message: "Registros movidos correctamente", changes: result.changes };
  }

  // Restaurar desde papelera
  async restaurar(id) {
    const result = await this.executeRun(
      `UPDATE registros SET eliminado = 0 WHERE id = ? AND eliminado = 1`,
      [id]
    );

    if (result.changes === 0) {
      throw new Error("El registro no existe o no está en papelera");
    }

    return { id, restaurado: true };
  }

  // Restaurar múltiples
  async restaurarMultiple(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("No se proporcionaron IDs válidos");
    }

    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.executeRun(
      `UPDATE registros SET eliminado = 0 WHERE id IN (${placeholders}) AND eliminado = 1`,
      ids
    );

    if (result.changes === 0) {
      throw new Error("Ningún registro fue restaurado");
    }

    return { restaurados: result.changes };
  }

  // Eliminar permanentemente con limpieza
  async eliminarPermanentemente(id) {
    return this.executeTransaction([
      async () => {
        // Obtener IDs relacionados
        const registro = await this.executeGet(
          "SELECT persona_id, expediente_id FROM registros WHERE id = ? AND eliminado = 1",
          [id]
        );

        if (!registro) {
          throw new Error("Registro no encontrado o no está en papelera");
        }

        const { persona_id, expediente_id } = registro;

        // Eliminar registro
        await this.executeRun("DELETE FROM registros WHERE id = ?", [id]);

        // Limpiar expediente si no está en uso
        const expedienteEnUso = await this.contar("registros", "expediente_id = ?", [expediente_id]);
        if (expedienteEnUso === 0) {
          await this.executeRun("DELETE FROM expedientes WHERE id = ?", [expediente_id]);
        }

        // Limpiar persona si no está en uso
        const personaEnUso = await this.contar("registros", "persona_id = ?", [persona_id]);
        if (personaEnUso === 0) {
          await this.executeRun("DELETE FROM personas WHERE id = ?", [persona_id]);
        }

        return {
          message: "Registro eliminado permanentemente. Datos relacionados limpiados si no estaban en uso."
        };
      }
    ]);
  }

  // Mover todos los registros de un DNI a papelera
  async moverDniCompletoPapelera(dni) {
    if (!dni || dni.trim() === "") {
      throw new Error("DNI inválido");
    }

    // Buscar personas con ese DNI
    const personas = await this.executeQuery(
      `SELECT id FROM personas WHERE dni = ?`,
      [dni]
    );

    if (personas.length === 0) {
      throw new Error("Persona no encontrada");
    }

    const personaIds = personas.map(p => p.id);

    // Buscar registros activos
    const placeholders = personaIds.map(() => '?').join(',');
    const registros = await this.executeQuery(
      `SELECT id FROM registros WHERE persona_id IN (${placeholders}) AND eliminado = 0`,
      personaIds
    );

    if (registros.length === 0) {
      return { success: true, total: 0, ids: [] };
    }

    // Mover a papelera
    const result = await this.executeRun(
      `UPDATE registros SET eliminado = 1 WHERE persona_id IN (${placeholders})`,
      personaIds
    );

    return {
      success: true,
      total: result.changes,
      ids: registros.map(r => r.id)
    };
  }

  // Buscar por DNI
  async buscarPorDni(dni) {
    return this.executeQuery(`
      SELECT 
        p.id AS persona_id,
        p.nombre,
        p.dni,
        p.numero,
        r.id AS registro_id,
        r.estado_id,
        r.fecha_registro,
        r.fecha_en_caja,
        e.id AS expediente_id,
        e.codigo,
        e.fecha_solicitud,
        e.fecha_entrega,
        e.observacion,
        es.nombre AS estado_nombre
      FROM personas p
      INNER JOIN registros r ON r.persona_id = p.id AND r.eliminado = 0
      LEFT JOIN estados es ON es.id = r.estado_id
      LEFT JOIN expedientes e ON e.id = r.expediente_id
      WHERE p.dni = ?
      ORDER BY r.fecha_registro ASC
    `, [dni]);
  }

  // Vaciar todos los registros
  async vaciarTodos() {
    return this.executeTransaction([
      async () => {
        // Vaciar registros
        await this.executeRun("DELETE FROM registros");

        // Limpiar tablas relacionadas
        await this.executeRun("DELETE FROM personas WHERE id NOT IN (SELECT persona_id FROM registros)");
        await this.executeRun("DELETE FROM expedientes WHERE id NOT IN (SELECT expediente_id FROM registros)");

        // Reiniciar autoincrement
        const tablas = ["registros", "personas", "expedientes"];
        for (const tabla of tablas) {
          await this.executeRun("UPDATE sqlite_sequence SET seq = 0 WHERE name = ?", [tabla]);
        }

        return { success: true };
      }
    ]);
  }

  // Métodos utilitarios
  validarCampos({ nombre, numero, dni, expediente }) {
    const hayAlgunCampoLleno = [nombre, numero, dni, expediente].some(val => val && val !== "");
    if (!hayAlgunCampoLleno) {
      throw new Error("Debe llenar al menos un campo");
    }

    if (dni && dni.length !== 8) {
      throw new Error("El DNI debe tener exactamente 8 dígitos");
    }
  }

  async validarExpedienteDuplicado(expediente) {
    if (expediente && expediente !== "") {
      const existe = await this.executeGet(
        `SELECT id FROM expedientes WHERE codigo = ?`,
        [expediente]
      );
      if (existe) {
        throw new Error("El expediente ya existe");
      }
    }
  }

  calcularFechaEnCaja(estado, fechaEnCaja) {
    switch (estado) {
      case "En Caja":
        return fechaEnCaja?.trim() || this.getFechaLocal();
      case "Tesoreria":
      case "Entregado":
        return "---";
      default:
        return "No entregado";
    }
  }

  getFechaLocal() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  // Obtener fechas disponibles para filtros
  async obtenerFechasDisponibles(tipo = "registro") {
    try {
      const campoFecha = tipo === "solicitud" ? "expedientes.fecha_solicitud" : "registros.fecha_registro";

      const query = `
        SELECT DISTINCT strftime('%Y', ${campoFecha}) as año
        FROM registros
        LEFT JOIN expedientes ON registros.expediente_id = expedientes.id
        WHERE registros.eliminado = 0 AND ${campoFecha} IS NOT NULL
        ORDER BY año DESC
      `;

      const rows = await this.executeQuery(query);
      return rows.map(row => row.año).filter(año => año);
    } catch (error) {
      console.error('Error obteniendo fechas disponibles:', error);
      return [];
    }
  }
}

module.exports = RegistroModel;
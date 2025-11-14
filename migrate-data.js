// migrate-data.js - Script para migrar datos de SQLite a Supabase
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Abrir SQLite
const db = new sqlite3.Database('./database.sqlite');

// Función para migrar una tabla
async function migrateTable(tableName, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Migrando tabla: ${tableName}`);

    db.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
      if (err) {
        console.error(`❌ Error leyendo ${tableName}:`, err.message);
        return reject(err);
      }

      if (rows.length === 0) {
        console.log(`   ℹ️  Sin datos para migrar`);
        return resolve({ tabla: tableName, migrados: 0 });
      }

      console.log(`   📊 Encontrados ${rows.length} registros`);

      try {
        // Adaptar datos si es necesario
        const datosAdaptados = rows.map(row => {
          const nuevo = { ...row };

          // Convertir INTEGER 0/1 a BOOLEAN
          if (options.booleanFields) {
            options.booleanFields.forEach(field => {
              if (nuevo[field] !== undefined) {
                nuevo[field] = nuevo[field] === 1;
              }
            });
          }

          return nuevo;
        });

        // Insertar en Supabase
        const { data, error } = await supabase
          .from(tableName)
          .insert(datosAdaptados);

        if (error) {
          // Si el error es por duplicados, intentar uno por uno
          if (error.code === '23505') {
            console.log(`   ⚠️  Detectados duplicados, insertando uno por uno...`);
            let insertados = 0;

            for (const item of datosAdaptados) {
              const { error: itemError } = await supabase
                .from(tableName)
                .insert(item);

              if (!itemError) {
                insertados++;
              } else if (itemError.code !== '23505') {
                console.error(`   ❌ Error insertando:`, itemError.message);
              }
            }

            console.log(`   ✅ ${insertados}/${rows.length} registros migrados (ignorados duplicados)`);
            return resolve({ tabla: tableName, migrados: insertados });
          } else {
            throw error;
          }
        }

        console.log(`   ✅ ${rows.length} registros migrados correctamente`);
        resolve({ tabla: tableName, migrados: rows.length });
      } catch (error) {
        console.error(`   ❌ Error migrando ${tableName}:`, error.message);
        if (error.details) console.error(`   📝 Detalles:`, error.details);
        reject(error);
      }
    });
  });
}

// Función principal de migración
async function migrate() {
  console.log('🚀 Iniciando migración de SQLite a Supabase...\n');
  console.log('⚠️  IMPORTANTE: Este script NO borrará datos existentes en Supabase');
  console.log('   Si ya ejecutaste el schema, los datos base ya están ahí.\n');

  const resultados = [];

  try {
    // Orden de migración (respetando foreign keys)

    // 1. Estados (sin dependencias)
    await migrateTable('estados');

    // 2. Usuarios (sin dependencias)
    await migrateTable('usuarios', {
      booleanFields: ['activo']
    });

    // 3. Personas (sin dependencias)
    await migrateTable('personas');

    // 4. Expedientes (depende de personas)
    await migrateTable('expedientes');

    // 5. Proyectos (depende de usuarios)
    await migrateTable('proyectos_registros', {
      booleanFields: ['es_publico', 'permite_edicion', 'activo']
    });

    // 6. Registros (depende de todo)
    await migrateTable('registros', {
      booleanFields: ['eliminado']
    });

    // 7. Documentos (depende de personas y usuarios)
    await migrateTable('documentos_persona');

    // 8. Auditoría (depende de usuarios y proyectos)
    await migrateTable('auditoria');

    console.log('\n🎉 ¡Migración completada!\n');

  } catch (error) {
    console.error('\n💥 Error durante la migración:', error.message);
  } finally {
    db.close();
    console.log('✅ Conexión SQLite cerrada\n');
  }
}

// Ejecutar migración
migrate().catch(console.error);

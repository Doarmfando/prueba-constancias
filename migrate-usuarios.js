// migrate-usuarios.js - Script para migrar SOLO usuarios de SQLite a Supabase
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

async function migrateUsuarios() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Migrando usuarios de SQLite a Supabase...\n');

    db.all('SELECT * FROM usuarios', async (err, usuarios) => {
      if (err) {
        console.error('❌ Error leyendo usuarios:', err.message);
        return reject(err);
      }

      console.log(`📊 Encontrados ${usuarios.length} usuarios en SQLite:\n`);

      // Mostrar usuarios antes de migrar
      usuarios.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.nombre_usuario || u.nombre} (${u.rol}) - ${u.email || 'sin email'}`);
      });

      console.log('\n⏳ Insertando en Supabase...\n');

      try {
        // Adaptar datos: convertir INTEGER (0/1) a BOOLEAN
        const usuariosAdaptados = usuarios.map(u => ({
          ...u,
          activo: u.activo === 1  // Convertir 1/0 a true/false
        }));

        // Intentar insertar todos
        const { data, error } = await supabase
          .from('usuarios')
          .insert(usuariosAdaptados);

        if (error) {
          // Si hay duplicados, intentar uno por uno
          if (error.code === '23505') {
            console.log('⚠️  Detectados duplicados, insertando uno por uno...\n');
            let insertados = 0;

            for (const usuario of usuariosAdaptados) {
              const { error: itemError } = await supabase
                .from('usuarios')
                .insert(usuario);

              if (!itemError) {
                console.log(`   ✅ ${usuario.nombre_usuario || usuario.nombre} - insertado`);
                insertados++;
              } else if (itemError.code === '23505') {
                console.log(`   ⏭️  ${usuario.nombre_usuario || usuario.nombre} - ya existe (ignorado)`);
              } else {
                console.error(`   ❌ ${usuario.nombre_usuario || usuario.nombre} - error:`, itemError.message);
              }
            }

            console.log(`\n🎉 Migración completada: ${insertados}/${usuarios.length} usuarios nuevos`);
          } else {
            throw error;
          }
        } else {
          console.log(`✅ ${usuarios.length} usuarios migrados correctamente`);
        }

        resolve();
      } catch (error) {
        console.error('❌ Error migrando usuarios:', error.message);
        if (error.details) console.error('📝 Detalles:', error.details);
        reject(error);
      } finally {
        db.close();
        console.log('\n✅ Conexión SQLite cerrada\n');
      }
    });
  });
}

// Ejecutar
migrateUsuarios().catch(console.error);

// vaciar-supabase.js
// Script para vaciar TODOS los datos de Supabase
// ⚠️ CUIDADO: Este script elimina todos los registros de la base de datos

require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function vaciarSupabase() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ⚠️  VACIAR BASE DE DATOS DE SUPABASE  ⚠️            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Este script eliminará TODOS los datos de las siguientes tablas:');
  console.log('  - registros');
  console.log('  - expedientes');
  console.log('  - personas');
  console.log('  - documentos_persona');
  console.log('  - proyectos_registros');
  console.log('  - auditoria');
  console.log('  - usuarios (excepto admins si lo deseas)');
  console.log('');
  console.log('⚠️  ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️');
  console.log('');

  const confirmacion1 = await pregunta('¿Estás seguro que quieres continuar? (escribe "SI" en mayúsculas): ');

  if (confirmacion1 !== 'SI') {
    console.log('❌ Operación cancelada');
    rl.close();
    return;
  }

  const confirmacion2 = await pregunta('¿Quieres mantener los usuarios administradores? (s/n): ');
  const mantenerAdmins = confirmacion2.toLowerCase() === 's';

  console.log('');
  console.log('🔄 Iniciando proceso de limpieza...');
  console.log('');

  try {
    // ============================================
    // 1. ELIMINAR REGISTROS
    // ============================================
    console.log('🗑️  Eliminando registros...');
    const { error: errorRegistros, count: countRegistros } = await supabaseAdmin
      .from('registros')
      .delete()
      .neq('id', 0); // Eliminar todos (excepto id=0 que no existe)

    if (errorRegistros) {
      console.error('❌ Error al eliminar registros:', errorRegistros.message);
    } else {
      console.log(`✅ Registros eliminados: ${countRegistros || 'todos'}`);
    }

    // ============================================
    // 2. ELIMINAR PROYECTOS
    // ============================================
    console.log('🗑️  Eliminando proyectos...');
    const { error: errorProyectos, count: countProyectos } = await supabaseAdmin
      .from('proyectos_registros')
      .delete()
      .neq('id', 0);

    if (errorProyectos) {
      console.error('❌ Error al eliminar proyectos:', errorProyectos.message);
    } else {
      console.log(`✅ Proyectos eliminados: ${countProyectos || 'todos'}`);
    }

    // ============================================
    // 3. ELIMINAR DOCUMENTOS DE PERSONA
    // ============================================
    console.log('🗑️  Eliminando documentos de persona...');
    const { error: errorDocs, count: countDocs } = await supabaseAdmin
      .from('documentos_persona')
      .delete()
      .neq('id', 0);

    if (errorDocs) {
      console.error('❌ Error al eliminar documentos:', errorDocs.message);
    } else {
      console.log(`✅ Documentos eliminados: ${countDocs || 'todos'}`);
    }

    // ============================================
    // 4. ELIMINAR EXPEDIENTES
    // ============================================
    console.log('🗑️  Eliminando expedientes...');
    const { error: errorExpedientes, count: countExpedientes } = await supabaseAdmin
      .from('expedientes')
      .delete()
      .neq('id', 0);

    if (errorExpedientes) {
      console.error('❌ Error al eliminar expedientes:', errorExpedientes.message);
    } else {
      console.log(`✅ Expedientes eliminados: ${countExpedientes || 'todos'}`);
    }

    // ============================================
    // 5. ELIMINAR PERSONAS
    // ============================================
    console.log('🗑️  Eliminando personas...');
    const { error: errorPersonas, count: countPersonas } = await supabaseAdmin
      .from('personas')
      .delete()
      .neq('id', 0);

    if (errorPersonas) {
      console.error('❌ Error al eliminar personas:', errorPersonas.message);
    } else {
      console.log(`✅ Personas eliminadas: ${countPersonas || 'todos'}`);
    }

    // ============================================
    // 6. ELIMINAR AUDITORÍA
    // ============================================
    console.log('🗑️  Eliminando registros de auditoría...');
    const { error: errorAuditoria, count: countAuditoria } = await supabaseAdmin
      .from('auditoria')
      .delete()
      .neq('id', 0);

    if (errorAuditoria) {
      console.error('❌ Error al eliminar auditoría:', errorAuditoria.message);
    } else {
      console.log(`✅ Auditoría eliminada: ${countAuditoria || 'todos'}`);
    }

    // ============================================
    // 7. ELIMINAR USUARIOS
    // ============================================
    if (mantenerAdmins) {
      console.log('🗑️  Eliminando usuarios trabajadores (manteniendo admins)...');
      const { error: errorUsuarios, count: countUsuarios } = await supabaseAdmin
        .from('usuarios')
        .delete()
        .eq('rol', 'trabajador');

      if (errorUsuarios) {
        console.error('❌ Error al eliminar usuarios:', errorUsuarios.message);
      } else {
        console.log(`✅ Usuarios trabajadores eliminados: ${countUsuarios || 'todos'}`);
      }

      // Eliminar usuarios de Auth también (trabajadores)
      console.log('🗑️  Eliminando usuarios trabajadores de Auth...');
      const { data: trabajadores } = await supabaseAdmin
        .from('usuarios')
        .select('auth_id')
        .eq('rol', 'trabajador');

      if (trabajadores && trabajadores.length > 0) {
        for (const trabajador of trabajadores) {
          if (trabajador.auth_id) {
            try {
              await supabaseAdmin.auth.admin.deleteUser(trabajador.auth_id);
            } catch (err) {
              console.warn(`⚠️  No se pudo eliminar usuario de Auth: ${trabajador.auth_id}`);
            }
          }
        }
      }

    } else {
      console.log('🗑️  Eliminando TODOS los usuarios...');

      // Primero obtener todos los auth_ids
      const { data: todosUsuarios } = await supabaseAdmin
        .from('usuarios')
        .select('auth_id');

      // Eliminar de tabla usuarios
      const { error: errorUsuarios, count: countUsuarios } = await supabaseAdmin
        .from('usuarios')
        .delete()
        .neq('id', 0);

      if (errorUsuarios) {
        console.error('❌ Error al eliminar usuarios:', errorUsuarios.message);
      } else {
        console.log(`✅ Usuarios eliminados de tabla: ${countUsuarios || 'todos'}`);
      }

      // Eliminar de Auth
      console.log('🗑️  Eliminando usuarios de Auth...');
      if (todosUsuarios && todosUsuarios.length > 0) {
        for (const usuario of todosUsuarios) {
          if (usuario.auth_id) {
            try {
              await supabaseAdmin.auth.admin.deleteUser(usuario.auth_id);
            } catch (err) {
              console.warn(`⚠️  No se pudo eliminar usuario de Auth: ${usuario.auth_id}`);
            }
          }
        }
        console.log(`✅ Usuarios eliminados de Auth`);
      }
    }

    // ============================================
    // 8. RESETEAR SECUENCIAS (OPCIONAL)
    // ============================================
    console.log('');
    const resetearIds = await pregunta('¿Quieres resetear los IDs autoincrementales a 1? (s/n): ');

    if (resetearIds.toLowerCase() === 's') {
      console.log('🔄 Reseteando secuencias...');

      const tablas = [
        'personas',
        'expedientes',
        'registros',
        'proyectos_registros',
        'documentos_persona',
        'auditoria',
        'usuarios'
      ];

      for (const tabla of tablas) {
        try {
          // Nota: Esto requiere permisos especiales en Supabase
          await supabaseAdmin.rpc('reset_sequence', { tabla_nombre: tabla });
          console.log(`  ✅ Secuencia de ${tabla} reseteada`);
        } catch (err) {
          console.warn(`  ⚠️  No se pudo resetear secuencia de ${tabla}`);
        }
      }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ LIMPIEZA COMPLETADA                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('La base de datos ha sido vaciada exitosamente.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR DURANTE LA LIMPIEZA:', error.message);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Ejecutar
vaciarSupabase().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

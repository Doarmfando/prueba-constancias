// migrate-usuarios-to-auth.js - Migrar usuarios existentes a Supabase Auth
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurar Supabase con SERVICE_ROLE_KEY para acceso admin
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Script para migrar usuarios de la tabla usuarios a Supabase Auth
 *
 * IMPORTANTE: Este script es para migrar usuarios que ya existen en tu tabla usuarios
 * y crear sus cuentas correspondientes en Supabase Auth.
 *
 * REQUISITOS:
 * 1. Los usuarios deben tener email válido
 * 2. Necesitarás asignar contraseñas temporales (se recomienda cambiarlas después)
 * 3. El schema debe estar actualizado (tabla usuarios con columna auth_id)
 */

async function migrarUsuariosAAuth() {
  try {
    console.log('🚀 Iniciando migración de usuarios a Supabase Auth...\n');

    // 1. Obtener usuarios que NO tienen auth_id (usuarios antiguos)
    const { data: usuarios, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .is('auth_id', null);

    if (fetchError) {
      throw new Error(`Error obteniendo usuarios: ${fetchError.message}`);
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('✅ No hay usuarios pendientes de migrar (todos ya tienen auth_id)');
      return;
    }

    console.log(`📊 Encontrados ${usuarios.length} usuarios sin auth_id:\n`);

    let migrados = 0;
    let errores = 0;
    const PASSWORD_TEMPORAL = 'CambiarMe123!'; // Contraseña temporal por defecto

    for (const usuario of usuarios) {
      console.log(`\n⏳ Procesando: ${usuario.nombre} (${usuario.email || 'SIN EMAIL'})`);

      // Validar que tenga email
      if (!usuario.email) {
        console.log(`   ⚠️  SALTADO: Usuario sin email. Asigna un email manualmente.`);
        errores++;
        continue;
      }

      try {
        // 2. Crear usuario en Supabase Auth
        console.log(`   📝 Creando en Auth con email: ${usuario.email}`);

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: usuario.email,
          password: PASSWORD_TEMPORAL,
          email_confirm: true, // Auto-confirmar email
          user_metadata: {
            nombre: usuario.nombre,
            nombre_usuario: usuario.nombre_usuario,
            rol: usuario.rol
          }
        });

        if (authError) {
          // Verificar si el email ya existe en auth
          if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
            console.log(`   ⚠️  El email ya está registrado en Auth`);

            // Intentar buscar el usuario en auth por email
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === usuario.email);

            if (existingUser) {
              console.log(`   🔗 Vinculando con usuario Auth existente: ${existingUser.id}`);

              // Actualizar el registro en la tabla usuarios con el auth_id
              const { error: updateError } = await supabase
                .from('usuarios')
                .update({ auth_id: existingUser.id })
                .eq('id', usuario.id);

              if (updateError) {
                console.log(`   ❌ Error al vincular: ${updateError.message}`);
                errores++;
              } else {
                console.log(`   ✅ Vinculado correctamente`);
                migrados++;
              }
            }
          } else {
            throw authError;
          }
          continue;
        }

        if (!authData.user) {
          throw new Error('No se recibió el usuario de Auth');
        }

        console.log(`   ✅ Usuario creado en Auth: ${authData.user.id}`);

        // 3. Actualizar la tabla usuarios con el auth_id
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ auth_id: authData.user.id })
          .eq('id', usuario.id);

        if (updateError) {
          console.log(`   ⚠️  Usuario creado en Auth pero error al actualizar tabla: ${updateError.message}`);
          errores++;
          continue;
        }

        console.log(`   ✅ Migrado correctamente`);
        migrados++;

      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        errores++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Usuarios migrados: ${migrados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📝 Total procesados: ${usuarios.length}`);
    console.log('='.repeat(60));

    if (migrados > 0) {
      console.log('\n⚠️  IMPORTANTE:');
      console.log(`   - Todos los usuarios migrados tienen la contraseña temporal: "${PASSWORD_TEMPORAL}"`);
      console.log('   - Se recomienda que cambien sus contraseñas al iniciar sesión');
      console.log('   - Los emails fueron auto-confirmados\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error.message);
    if (error.details) console.error('📝 Detalles:', error.details);
    process.exit(1);
  }
}

// Función auxiliar para crear usuario administrador de prueba
async function crearAdminPrueba() {
  console.log('\n🔧 Creando usuario administrador de prueba...\n');

  const adminData = {
    email: 'admin@ejemplo.com',
    password: 'Admin123!',
    nombre: 'Administrador',
    nombre_usuario: 'admin',
    rol: 'administrador'
  };

  try {
    // Crear en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: {
        nombre: adminData.nombre,
        nombre_usuario: adminData.nombre_usuario,
        rol: adminData.rol
      }
    });

    if (authError) {
      throw authError;
    }

    console.log('✅ Administrador creado exitosamente:');
    console.log(`   📧 Email: ${adminData.email}`);
    console.log(`   🔑 Password: ${adminData.password}`);
    console.log(`   🆔 Auth ID: ${authData.user.id}\n`);

    // Esperar a que el trigger cree el registro
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar que se creó en la tabla usuarios
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (usuario) {
      console.log('✅ Registro creado automáticamente en tabla usuarios');
    }

  } catch (error) {
    if (error.message.includes('already registered')) {
      console.log('⚠️  El administrador ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Menú principal
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📚 USO DEL SCRIPT DE MIGRACIÓN:

  node migrate-usuarios-to-auth.js [opciones]

OPCIONES:
  (sin opciones)    Migrar usuarios existentes a Supabase Auth
  --admin           Crear usuario administrador de prueba
  --help, -h        Mostrar esta ayuda

EJEMPLOS:
  node migrate-usuarios-to-auth.js           # Migrar usuarios
  node migrate-usuarios-to-auth.js --admin   # Crear admin de prueba
  `);
  process.exit(0);
}

if (args.includes('--admin')) {
  crearAdminPrueba().catch(console.error);
} else {
  migrarUsuariosAAuth().catch(console.error);
}

// crear-admin-brando.js
// Script para crear el usuario administrador inicial: Brando
// El trigger automático creará el registro en la tabla usuarios

require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function crearAdminBrando() {
  console.log('========================================');
  console.log('📝 CREANDO USUARIO ADMINISTRADOR');
  console.log('========================================\n');

  try {
    // Crear usuario en Supabase Auth
    // El trigger on_auth_user_created creará automáticamente el registro en tabla usuarios
    console.log('🔐 Creando usuario en Supabase Auth...');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'brandoarmas@hotmail.com',
      password: 'brando',
      email_confirm: true,  // Auto-confirmar email
      user_metadata: {
        nombre: 'Brando',
        nombre_usuario: 'brando',
        rol: 'administrador'  // El trigger leerá esto y lo asignará en la tabla usuarios
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        console.log('⚠️  El email ya está registrado en Auth');
        console.log('Buscando usuario existente en tabla usuarios...\n');

        // Buscar usuario existente
        const { data: existingUser } = await supabaseAdmin
          .from('usuarios')
          .select('*')
          .eq('email', 'brandoarmas@hotmail.com')
          .single();

        if (existingUser) {
          console.log('✅ Usuario encontrado:');
          console.log('   ID:', existingUser.id);
          console.log('   Nombre:', existingUser.nombre);
          console.log('   Usuario:', existingUser.nombre_usuario);
          console.log('   Email:', existingUser.email);
          console.log('   Rol:', existingUser.rol);
          console.log('   Activo:', existingUser.activo);
          console.log('');
          console.log('🎉 Puedes iniciar sesión con:');
          console.log('   Usuario/Email: brando o brandoarmas@hotmail.com');
          console.log('   Contraseña: brando');
          console.log('');
          return;
        } else {
          console.log('⚠️  Usuario existe en Auth pero no en tabla usuarios');
          console.log('Esto puede deberse a un problema con el trigger');
        }
        return;
      }
      throw authError;
    }

    console.log('✅ Usuario creado en Auth');
    console.log('   Auth ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('');

    // Esperar a que el trigger cree el registro en la tabla usuarios
    console.log('⏳ Esperando a que el trigger cree el registro en tabla usuarios...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar que se creó en la tabla usuarios
    const { data: usuario, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (dbError) {
      console.error('❌ Error al verificar usuario en tabla usuarios:', dbError.message);
      console.error('   El usuario se creó en Auth pero puede que el trigger haya fallado');
      console.error('   Verifica que el trigger on_auth_user_created esté activo en Supabase');
    } else {
      console.log('✅ Usuario creado en tabla usuarios:');
      console.log('   ID:', usuario.id);
      console.log('   Nombre:', usuario.nombre);
      console.log('   Usuario:', usuario.nombre_usuario);
      console.log('   Email:', usuario.email);
      console.log('   Rol:', usuario.rol);
      console.log('   Activo:', usuario.activo);
    }

    console.log('');
    console.log('========================================');
    console.log('✅ USUARIO ADMINISTRADOR CREADO');
    console.log('========================================\n');
    console.log('🎉 Credenciales de acceso:');
    console.log('   Usuario: brando');
    console.log('   Email: brandoarmas@hotmail.com');
    console.log('   Contraseña: brando');
    console.log('   Rol: administrador');
    console.log('');
    console.log('💡 Puedes iniciar sesión usando el nombre de usuario o el email');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR AL CREAR USUARIO:', error.message);
    console.error(error);
    console.error('');
    console.error('Posibles causas:');
    console.error('  - Credenciales de Supabase incorrectas en .env');
    console.error('  - Trigger on_auth_user_created no está activo');
    console.error('  - Problemas de conexión con Supabase');
  }
}

// Ejecutar
crearAdminBrando().then(() => {
  console.log('Proceso finalizado');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

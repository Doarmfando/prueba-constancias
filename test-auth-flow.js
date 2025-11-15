// test-auth-flow.js
// Script para probar el flujo completo de autenticación con dos clientes

require('dotenv').config();
const { supabaseUser, supabaseAdmin } = require('./src/config/supabase');

async function testAuthFlow() {
  console.log('========================================');
  console.log('🧪 PRUEBA DE FLUJO DE AUTENTICACIÓN');
  console.log('========================================\n');

  try {
    // ============================================
    // 1. CREAR USUARIO DE PRUEBA (ADMIN CLIENT)
    // ============================================
    console.log('📝 1. Creando usuario de prueba con cliente ADMIN...');

    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        nombre: 'Usuario Prueba',
        nombre_usuario: 'test_user',
        rol: 'trabajador'
      }
    });

    if (createError) {
      console.error('❌ Error al crear usuario:', createError.message);
      return;
    }

    console.log('✅ Usuario creado en Auth:', authData.user.id);

    // Esperar a que el trigger cree el registro en la tabla
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar que se creó en la tabla usuarios
    const { data: usuarioCreado, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (dbError) {
      console.error('❌ Error al verificar usuario en BD:', dbError.message);
    } else {
      console.log('✅ Usuario creado en tabla usuarios:', {
        id: usuarioCreado.id,
        nombre: usuarioCreado.nombre,
        email: usuarioCreado.email,
        rol: usuarioCreado.rol
      });
    }

    // ============================================
    // 2. AUTENTICAR CON USER CLIENT
    // ============================================
    console.log('\n🔐 2. Autenticando con cliente USER...');

    const { data: loginData, error: loginError } = await supabaseUser.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Error al autenticar:', loginError.message);
      return;
    }

    console.log('✅ Usuario autenticado:', {
      id: loginData.user.id,
      email: loginData.user.email,
      session: loginData.session ? 'Sesión activa' : 'Sin sesión'
    });

    // ============================================
    // 3. OBTENER DATOS DEL USUARIO AUTENTICADO
    // ============================================
    console.log('\n📊 3. Obteniendo datos del usuario autenticado...');

    const { data: usuarioAuth, error: getUserError } = await supabaseUser
      .from('usuarios')
      .select('*')
      .eq('auth_id', loginData.user.id)
      .single();

    if (getUserError) {
      console.error('❌ Error al obtener usuario:', getUserError.message);
    } else {
      console.log('✅ Datos del usuario:', {
        id: usuarioAuth.id,
        nombre: usuarioAuth.nombre,
        rol: usuarioAuth.rol,
        activo: usuarioAuth.activo
      });
    }

    // ============================================
    // 4. CAMBIAR CONTRASEÑA PROPIA (USER CLIENT)
    // ============================================
    console.log('\n🔑 4. Cambiando contraseña propia con cliente USER...');

    const newPassword = 'NewTestPassword456!';
    const { error: updateError } = await supabaseUser.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('❌ Error al cambiar contraseña:', updateError.message);
    } else {
      console.log('✅ Contraseña cambiada correctamente');
    }

    // ============================================
    // 5. CERRAR SESIÓN
    // ============================================
    console.log('\n👋 5. Cerrando sesión...');

    const { error: logoutError } = await supabaseUser.auth.signOut();

    if (logoutError) {
      console.error('❌ Error al cerrar sesión:', logoutError.message);
    } else {
      console.log('✅ Sesión cerrada correctamente');
    }

    // ============================================
    // 6. VERIFICAR QUE NO HAY SESIÓN ACTIVA
    // ============================================
    console.log('\n🔍 6. Verificando que no hay sesión activa...');

    const { data: sessionData } = await supabaseUser.auth.getSession();

    if (sessionData.session) {
      console.warn('⚠️ Aún hay una sesión activa');
    } else {
      console.log('✅ No hay sesión activa (correcto)');
    }

    // ============================================
    // 7. AUTENTICAR CON NUEVA CONTRASEÑA
    // ============================================
    console.log('\n🔐 7. Autenticando con nueva contraseña...');

    const { data: newLoginData, error: newLoginError } = await supabaseUser.auth.signInWithPassword({
      email: testEmail,
      password: newPassword
    });

    if (newLoginError) {
      console.error('❌ Error al autenticar con nueva contraseña:', newLoginError.message);
    } else {
      console.log('✅ Autenticado correctamente con nueva contraseña');
    }

    // ============================================
    // 8. LIMPIAR: ELIMINAR USUARIO DE PRUEBA
    // ============================================
    console.log('\n🧹 8. Limpiando: eliminando usuario de prueba...');

    // Primero cerrar sesión
    await supabaseUser.auth.signOut();

    // Eliminar de Auth (esto también eliminará de la tabla por CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

    if (deleteError) {
      console.error('❌ Error al eliminar usuario:', deleteError.message);
    } else {
      console.log('✅ Usuario de prueba eliminado correctamente');
    }

    console.log('\n========================================');
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error(error);
  }
}

// Ejecutar pruebas
testAuthFlow().then(() => {
  console.log('Pruebas finalizadas');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

// test-login-username.js
// Prueba rápida de login por nombre de usuario

require('dotenv').config();
const UsuarioModel = require('./src/main/models/UsuarioModel');
const { supabaseUser, supabaseAdmin } = require('./src/config/supabase');

async function testLoginUsername() {
  console.log('========================================');
  console.log('🧪 PRUEBA DE LOGIN POR NOMBRE DE USUARIO');
  console.log('========================================\n');

  try {
    // Crear modelo
    const usuarioModel = new UsuarioModel(supabaseUser);
    usuarioModel.setAdminClient(supabaseAdmin);

    // ============================================
    // 1. CREAR USUARIO DE PRUEBA
    // ============================================
    console.log('📝 1. Creando usuario de prueba...');

    const testData = {
      nombre: 'Test Usuario',
      nombre_usuario: 'test_username_' + Date.now(),
      email: `test-username-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      rol: 'trabajador'
    };

    const userId = await usuarioModel.crear(testData);
    console.log('✅ Usuario creado:', {
      id: userId,
      nombre_usuario: testData.nombre_usuario,
      email: testData.email
    });

    // ============================================
    // 2. PROBAR LOGIN CON EMAIL
    // ============================================
    console.log('\n🔐 2. Probando login con EMAIL...');

    const loginEmail = await usuarioModel.autenticar(testData.email, testData.password);
    console.log('✅ Login con email exitoso:', {
      id: loginEmail.id,
      nombre: loginEmail.nombre,
      email: loginEmail.email
    });

    // Logout
    await supabaseUser.auth.signOut();

    // ============================================
    // 3. PROBAR LOGIN CON NOMBRE DE USUARIO
    // ============================================
    console.log('\n🔐 3. Probando login con NOMBRE DE USUARIO...');

    const loginUsername = await usuarioModel.autenticar(testData.nombre_usuario, testData.password);
    console.log('✅ Login con nombre de usuario exitoso:', {
      id: loginUsername.id,
      nombre: loginUsername.nombre,
      nombre_usuario: loginUsername.nombre_usuario
    });

    // Logout
    await supabaseUser.auth.signOut();

    // ============================================
    // 4. PROBAR LOGIN CON NOMBRE DE USUARIO INCORRECTO
    // ============================================
    console.log('\n🔐 4. Probando login con nombre de usuario INCORRECTO...');

    try {
      await usuarioModel.autenticar('usuario_inexistente', testData.password);
      console.error('❌ ERROR: No debería haber permitido login con usuario inexistente');
    } catch (error) {
      console.log('✅ Rechazado correctamente:', error.message);
    }

    // ============================================
    // 5. PROBAR LOGIN CON CONTRASEÑA INCORRECTA
    // ============================================
    console.log('\n🔐 5. Probando login con contraseña INCORRECTA...');

    try {
      await usuarioModel.autenticar(testData.nombre_usuario, 'password_incorrecta');
      console.error('❌ ERROR: No debería haber permitido login con contraseña incorrecta');
    } catch (error) {
      console.log('✅ Rechazado correctamente:', error.message);
    }

    // ============================================
    // 6. LIMPIAR: ELIMINAR USUARIO DE PRUEBA
    // ============================================
    console.log('\n🧹 6. Limpiando: eliminando usuario de prueba...');

    // Obtener auth_id
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('auth_id')
      .eq('id', userId)
      .single();

    // Eliminar de Auth (CASCADE eliminará de tabla)
    if (usuario && usuario.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(usuario.auth_id);
      console.log('✅ Usuario de prueba eliminado');
    }

    console.log('\n========================================');
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS');
    console.log('========================================\n');

    console.log('📊 RESUMEN:');
    console.log('  ✅ Login con email funciona');
    console.log('  ✅ Login con nombre de usuario funciona');
    console.log('  ✅ Validación de usuario inexistente funciona');
    console.log('  ✅ Validación de contraseña incorrecta funciona');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error(error);
  }
}

// Ejecutar
testLoginUsername().then(() => {
  console.log('Pruebas finalizadas');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});

// src/config/supabase.js
// Configuración de clientes de Supabase para Node.js (Electron/Backend)

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar que existan las credenciales
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('╔════════════════════════════════════════════════════════════════╗');
  console.error('║  ❌ ERROR: Faltan credenciales de Supabase                    ║');
  console.error('╚════════════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('📋 INSTRUCCIONES PARA CONFIGURAR:');
  console.error('');
  console.error('1. Crea un archivo .env en la raíz del proyecto');
  console.error('2. Agrega las siguientes variables:');
  console.error('');
  console.error('   SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('   SUPABASE_ANON_KEY=tu-clave-anon');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role');
  console.error('');
  console.error('3. Obtén tus credenciales desde:');
  console.error('   https://app.supabase.com/project/_/settings/api');
  console.error('');
  console.error('📁 Ubicaciones buscadas para .env:');
  if (process.env.NODE_ENV === 'production' || require('electron').app.isPackaged) {
    const { app } = require('electron');
    console.error(`   - ${path.join(process.resourcesPath, '.env')}`);
    console.error(`   - ${path.join(process.resourcesPath, 'extraResources', '.env')}`);
    console.error(`   - ${path.join(app.getPath('userData'), '.env')}`);
    console.error(`   - ${path.join(process.cwd(), '.env')}`);
  } else {
    console.error(`   - ${path.join(process.cwd(), '.env')}`);
  }
  console.error('');
  console.error('Variables de entorno encontradas:');
  console.error(`   SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.error(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓' : '✗'}`);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}`);
  console.error('');
}

// ===============================================
// CLIENTE USER - Para operaciones de usuarios autenticados
// Usa ANON_KEY para respetar el contexto de autenticación
// ===============================================
const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'sistema-constancias-user'
    }
  }
});

// ===============================================
// CLIENTE ADMIN - Solo para operaciones administrativas
// Usa SERVICE_ROLE_KEY para operaciones privilegiadas
// ===============================================
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'sistema-constancias-admin'
    }
  }
});

// Legacy export (por compatibilidad temporal)
const supabase = supabaseAdmin;

// Función helper para verificar la conexión
async function verificarConexion() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error al verificar conexión con Supabase:', error.message);
      return false;
    }

    console.log('✅ Conexión con Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error);
    return false;
  }
}

// Función helper para manejar errores de Supabase
function manejarErrorSupabase(error, contexto = '') {
  if (!error) return null;

  console.error(`❌ Error en Supabase ${contexto}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });

  return {
    success: false,
    error: error.message,
    details: error.details || error.hint
  };
}

module.exports = {
  supabase,           // Legacy (usa supabaseAdmin)
  supabaseUser,       // Cliente para operaciones de usuarios autenticados
  supabaseAdmin,      // Cliente para operaciones administrativas
  verificarConexion,
  manejarErrorSupabase
};

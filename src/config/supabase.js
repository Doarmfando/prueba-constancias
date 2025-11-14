// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Validar que existan las credenciales
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan credenciales de Supabase');
  console.error('Por favor configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env');
}

// Crear cliente de Supabase con Service Role (bypasea RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
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
      'x-application-name': 'sistema-constancias'
    }
  }
});

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
  supabase,
  verificarConexion,
  manejarErrorSupabase
};

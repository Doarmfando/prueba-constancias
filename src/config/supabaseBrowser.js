// src/config/supabaseBrowser.js
// Configuración de Supabase para el navegador (modo web)

import { createClient } from '@supabase/supabase-js';

// Obtener credenciales desde las variables de entorno
// En modo web, estas se inyectan durante el build de webpack
const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';

// Validar credenciales (solo advertencia, no error)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Advertencia: Credenciales de Supabase no configuradas');
  console.warn('Por favor, configura SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env');
  console.warn('Realtime no estará disponible hasta que configures estas variables.');
}

// ===============================================
// CLIENTE USER - Para navegador (modo web)
// Usa ANON_KEY para respetar RLS y autenticación
// ===============================================

// Solo crear el cliente si las credenciales están disponibles
let supabaseUser = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Configuración para navegador
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token'
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'sistema-constancias-web'
        }
      },
      // Configuración de Realtime
      realtime: {
        params: {
          eventsPerSecond: 10 // Límite de eventos por segundo
        }
      }
    });
    console.log('✅ Cliente de Supabase inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar cliente de Supabase:', error);
  }
} else {
  console.warn('⚠️ Cliente de Supabase no inicializado (faltan credenciales)');
}

export { supabaseUser };

// ===============================================
// FUNCIONES HELPER
// ===============================================

/**
 * Verifica si el cliente de Supabase está correctamente configurado
 */
export const verificarConfiguracion = () => {
  const configurado = !!(supabaseUrl && supabaseAnonKey && supabaseUser);

  if (!configurado) {
    console.error('❌ Supabase no está configurado correctamente');
    return false;
  }

  console.log('✅ Supabase configurado correctamente');
  return true;
};

/**
 * Verifica la conexión con Supabase
 */
export const verificarConexion = async () => {
  if (!supabaseUser) {
    console.warn('⚠️ No se puede verificar conexión: Cliente de Supabase no inicializado');
    return false;
  }

  try {
    const { data, error } = await supabaseUser
      .from('personas')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error al conectar con Supabase:', error.message);
      return false;
    }

    console.log('✅ Conexión con Supabase establecida');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error);
    return false;
  }
};

/**
 * Maneja errores de Supabase de forma consistente
 */
export const manejarErrorSupabase = (error, contexto = '') => {
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
};

// Exportar también como default
export default {
  supabaseUser,
  verificarConfiguracion,
  verificarConexion,
  manejarErrorSupabase
};

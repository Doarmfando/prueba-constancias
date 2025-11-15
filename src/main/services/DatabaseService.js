// src/main/services/DatabaseService.js
const { supabase, supabaseUser, supabaseAdmin, verificarConexion } = require('../../config/supabase');

class DatabaseService {
  constructor() {
    this.supabase = supabase; // Legacy (admin)
    this.supabaseUser = supabaseUser;
    this.supabaseAdmin = supabaseAdmin;
    this.connected = false;
  }

  async connect() {
    console.log('🔄 Conectando a Supabase...');
    console.log('🔄 Entorno:', process.env.NODE_ENV || 'development');

    try {
      // Verificar la conexión
      const isConnected = await verificarConexion();

      if (isConnected) {
        this.connected = true;
        console.log('✅ Conectado a Supabase exitosamente');
        console.log('   - Cliente USER: Para operaciones de usuarios autenticados');
        console.log('   - Cliente ADMIN: Para operaciones administrativas');
        await this.verificarEsquema();
        return {
          user: this.supabaseUser,
          admin: this.supabaseAdmin
        };
      } else {
        throw new Error('No se pudo establecer conexión con Supabase');
      }
    } catch (error) {
      console.error('❌ Error al conectar a Supabase:', error.message);
      throw error;
    }
  }

  getDatabase() {
    return this.supabase;
  }

  getUserClient() {
    return this.supabaseUser;
  }

  getAdminClient() {
    return this.supabaseAdmin;
  }

  async verificarEsquema() {
    console.log('🔍 Verificando esquema de base de datos...');

    try {
      const tablasEsperadas = [
        'registros',
        'personas',
        'expedientes',
        'estados',
        'usuarios',
        'proyectos_registros',
        'documentos_persona',
        'auditoria'
      ];

      // Verificar cada tabla
      const verificaciones = await Promise.all(
        tablasEsperadas.map(async (tabla) => {
          const { count, error } = await this.supabase
            .from(tabla)
            .select('*', { count: 'exact', head: true });

          return {
            tabla,
            existe: !error,
            error: error?.message
          };
        })
      );

      const tablasExistentes = verificaciones.filter(v => v.existe).map(v => v.tabla);
      const tablasFaltantes = verificaciones.filter(v => !v.existe);

      console.log('📋 Tablas encontradas:', tablasExistentes);

      if (tablasFaltantes.length > 0) {
        console.warn('⚠️ Tablas faltantes o con errores:');
        tablasFaltantes.forEach(t => {
          console.warn(`   - ${t.tabla}: ${t.error}`);
        });
      } else {
        console.log('✅ Todas las tablas principales encontradas');
      }

      return {
        existentes: tablasExistentes,
        faltantes: tablasFaltantes.map(t => t.tabla)
      };
    } catch (error) {
      console.error('❌ Error verificando esquema:', error.message);
      return {
        existentes: [],
        faltantes: []
      };
    }
  }

  close() {
    // Supabase maneja las conexiones automáticamente
    console.log('ℹ️ Supabase maneja las conexiones automáticamente');
    this.connected = false;
  }

  // Método utilitario para transacciones
  // Nota: Supabase no soporta transacciones directamente desde el cliente
  // Para transacciones complejas, se debe usar PostgreSQL Functions o RPC
  async runTransaction(operations) {
    console.warn('⚠️ Las transacciones en Supabase requieren PostgreSQL Functions');
    console.warn('Ejecutando operaciones secuencialmente sin transacción...');

    try {
      const results = [];
      for (const operation of operations) {
        const result = await operation;
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('❌ Error en operaciones:', error);
      throw error;
    }
  }

  // Nuevo método helper para ejecutar RPC (Remote Procedure Call)
  async executeRPC(functionName, params = {}) {
    try {
      const { data, error } = await this.supabase
        .rpc(functionName, params);

      if (error) {
        console.error(`❌ Error ejecutando RPC ${functionName}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`❌ Error en RPC ${functionName}:`, error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
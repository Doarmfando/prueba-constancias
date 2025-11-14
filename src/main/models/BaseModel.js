// src/main/models/BaseModel.js
const { manejarErrorSupabase } = require('../../config/supabase');

class BaseModel {
  constructor(supabaseClient, tableName) {
    this.db = supabaseClient;
    this.tableName = tableName;
  }

  // ============================================
  // MÉTODOS CRUD BÁSICOS CON SUPABASE
  // ============================================

  // Obtener todos los registros
  async getAll(columns = '*', filters = {}) {
    try {
      let query = this.db.from(this.tableName).select(columns);

      // Aplicar filtros si existen
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error en getAll de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Obtener por ID
  async getById(id, columns = '*') {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select(columns)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error en getById de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Crear registro
  async create(datos) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .insert(datos)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error en create de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Actualizar registro
  async update(id, datos) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .update(datos)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error en update de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Eliminar registro
  async delete(id) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error en delete de ${this.tableName}:`, error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS DE COMPATIBILIDAD CON SQLITE
  // ============================================

  // Ejecutar consulta personalizada usando RPC
  async executeQuery(functionName, params = {}) {
    try {
      const { data, error } = await this.db.rpc(functionName, params);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error en executeQuery (${functionName}):`, error);
      throw error;
    }
  }

  // Ejecutar operación que modifica datos
  async executeRun(operation, params = {}) {
    console.warn('⚠️ executeRun: Se recomienda usar create/update/delete en lugar de SQL directo');
    return await this.executeQuery(operation, params);
  }

  // Obtener un solo registro
  async executeGet(functionName, params = {}) {
    try {
      const data = await this.executeQuery(functionName, params);
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error(`Error en executeGet (${functionName}):`, error);
      throw error;
    }
  }

  // Ejecutar transacción (requiere PostgreSQL function)
  async executeTransaction(operations) {
    console.warn('⚠️ Las transacciones requieren PostgreSQL Functions en Supabase');
    console.warn('Ejecutando operaciones secuencialmente...');

    try {
      const results = [];
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Error en transacción:', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  // Verificar si existe un registro
  async existe(campo, valor) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('id')
        .eq(campo, valor)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error(`Error en existe de ${this.tableName}:`, error);
      return false;
    }
  }

  // Contar registros
  async contar(filters = {}) {
    try {
      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error(`Error en contar de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Búsqueda con paginación
  async paginate(page = 1, limit = 10, filters = {}, columns = '*') {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = this.db
        .from(this.tableName)
        .select(columns, { count: 'exact' })
        .range(from, to);

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error(`Error en paginate de ${this.tableName}:`, error);
      throw error;
    }
  }

  // Búsqueda por texto (text search)
  async search(column, searchTerm, columns = '*') {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select(columns)
        .ilike(column, `%${searchTerm}%`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error en search de ${this.tableName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseModel;
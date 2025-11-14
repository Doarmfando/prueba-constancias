# Guía de Migración a Supabase + PostgreSQL

Esta guía te ayudará a migrar tu aplicación desde SQLite a Supabase (PostgreSQL).

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Migración del Esquema](#migración-del-esquema)
4. [Configuración de la Aplicación](#configuración-de-la-aplicación)
5. [Migración de Datos](#migración-de-datos)
6. [Siguientes Pasos](#siguientes-pasos)

---

## Requisitos Previos

- Cuenta en [Supabase](https://supabase.com) (es gratis)
- Node.js instalado
- Acceso a tu base de datos SQLite actual

## Configuración de Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en **"New Project"**
4. Completa la información:
   - **Name**: Sistema Constancias (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña en un lugar seguro
   - **Region**: Elige la más cercana a tu ubicación
5. Click en **"Create new project"**
6. Espera 1-2 minutos mientras se crea el proyecto

### 2. Obtener las Credenciales

1. Una vez creado el proyecto, ve a **Settings** > **API**
2. Encontrarás:
   - **Project URL**: Tu URL de Supabase
   - **service_role key**: Tu clave de servicio (**¡IMPORTANTE!** Esta la usaremos)
   - ~~anon/public key~~: No la usaremos (tu app tiene su propia autenticación)
3. Copia estos valores, los necesitarás en el siguiente paso

**⚠️ IMPORTANTE:** Usa la **service_role** key porque:
- Tu aplicación maneja su propia autenticación (tabla `usuarios`)
- Bypasea las políticas RLS de Supabase
- Permite que 10+ usuarios trabajen simultáneamente sin conflictos
- La seguridad la controla tu aplicación (como ahora con SQLite)

---

## Migración del Esquema

### 1. Ejecutar el Script SQL

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Abre el archivo `supabase-schema.sql` de este proyecto
3. Copia todo el contenido
4. Pégalo en el editor SQL de Supabase
5. Click en **"Run"** o presiona **Ctrl+Enter**
6. Verifica que todas las tablas se hayan creado correctamente

### 2. Verificar las Tablas

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - ✅ usuarios
   - ✅ personas
   - ✅ estados
   - ✅ expedientes
   - ✅ proyectos_registros
   - ✅ registros
   - ✅ documentos_persona
   - ✅ auditoria

---

## Configuración de la Aplicación

### 1. Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto (si no existe)
2. Copia el contenido de `.env.example`
3. Reemplaza los valores:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
NODE_ENV=development
```

**⚠️ Usa SERVICE_ROLE_KEY, NO anon key** para aplicaciones con múltiples usuarios simultáneos

### 2. Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

Ya está instalado en este proyecto, pero asegúrate ejecutando:

```bash
npm list @supabase/supabase-js
```

---

## Migración de Datos

### Opción 1: Exportar e Importar Manualmente

#### Exportar desde SQLite

```bash
sqlite3 database.sqlite .dump > data-backup.sql
```

#### Adaptar el SQL para PostgreSQL

Algunos cambios necesarios:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY`
- `TEXT` → `TEXT` (compatible)
- `datetime('now')` → `NOW()`
- `CURRENT_TIMESTAMP` → `NOW()`

#### Importar a Supabase

1. Abre el SQL Editor en Supabase
2. Ejecuta los INSERT statements adaptados
3. Verifica los datos en Table Editor

### Opción 2: Script de Migración (Recomendado)

Crea un script Node.js para migrar automáticamente:

```javascript
// migration-script.js
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const db = new sqlite3.Database('./database.sqlite');

async function migrateTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
      if (err) return reject(err);

      if (rows.length > 0) {
        const { data, error } = await supabase
          .from(tableName)
          .insert(rows);

        if (error) {
          console.error(`Error migrando ${tableName}:`, error);
          reject(error);
        } else {
          console.log(`✅ ${tableName}: ${rows.length} registros migrados`);
          resolve(data);
        }
      } else {
        console.log(`ℹ️ ${tableName}: Sin datos para migrar`);
        resolve([]);
      }
    });
  });
}

async function migrate() {
  const tablas = [
    'estados',
    'usuarios',
    'personas',
    'expedientes',
    'proyectos_registros',
    'registros',
    'documentos_persona',
    'auditoria'
  ];

  for (const tabla of tablas) {
    try {
      await migrateTable(tabla);
    } catch (error) {
      console.error(`Error en ${tabla}:`, error);
    }
  }

  db.close();
  console.log('🎉 Migración completada');
}

migrate();
```

Ejecutar:

```bash
node migration-script.js
```

---

## Configuración de Supabase Storage

Para los documentos de personas que actualmente guardas localmente:

### 1. Crear un Bucket

1. Ve a **Storage** en Supabase
2. Click en **"New bucket"**
3. Nombre: `documentos-persona`
4. Configuración:
   - **Public bucket**: NO (privado)
   - Click en **"Create bucket"**

### 2. Configurar Políticas de Acceso (RLS)

```sql
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios pueden ver documentos"
ON storage.objects FOR SELECT
USING (auth.role() = 'authenticated' AND bucket_id = 'documentos-persona');

-- Permitir subir archivos
CREATE POLICY "Usuarios pueden subir documentos"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'documentos-persona');
```

### 3. Adaptar el Código de Subida de Archivos

```javascript
// Ejemplo de subida de archivo a Supabase Storage
async function subirDocumento(file, personaId) {
  const filePath = `persona-${personaId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('documentos-persona')
    .upload(filePath, file);

  if (error) throw error;

  // Obtener URL pública (si el bucket es público)
  const { data: { publicUrl } } = supabase.storage
    .from('documentos-persona')
    .getPublicUrl(filePath);

  return {
    ruta_archivo: filePath,
    url_publica: publicUrl
  };
}
```

---

## Cambios en los Modelos

### Antes (SQLite)

```javascript
class PersonaModel extends BaseModel {
  constructor(db) {
    super(db, 'personas');
  }

  async obtenerTodos() {
    const query = 'SELECT * FROM personas';
    return this.executeQuery(query);
  }
}
```

### Después (Supabase)

```javascript
class PersonaModel extends BaseModel {
  constructor(supabaseClient) {
    super(supabaseClient, 'personas');
  }

  async obtenerTodos() {
    return await this.getAll('*');
  }

  async obtenerPorId(id) {
    return await this.getById(id);
  }

  async crear(datos) {
    return await this.create(datos);
  }
}
```

---

## Diferencias Clave SQLite vs PostgreSQL

### Tipos de Datos

| SQLite | PostgreSQL | Nota |
|--------|------------|------|
| `INTEGER` | `BIGINT` | Para IDs |
| `TEXT` | `TEXT` o `VARCHAR` | Compatible |
| `REAL` | `NUMERIC` o `DECIMAL` | Para decimales |
| `BLOB` | `BYTEA` | Para archivos (mejor usar Storage) |

### Funciones

| SQLite | PostgreSQL |
|--------|------------|
| `datetime('now')` | `NOW()` |
| `date('now')` | `CURRENT_DATE` |
| `||` (concatenar) | `||` o `CONCAT()` |

### AUTO INCREMENT

```sql
-- SQLite
id INTEGER PRIMARY KEY AUTOINCREMENT

-- PostgreSQL
id BIGSERIAL PRIMARY KEY
-- o
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

---

## Verificación Post-Migración

### 1. Verificar la Conexión

```bash
npm run dev
```

Deberías ver en la consola:
```
✅ Conectado a Supabase exitosamente
✅ Todas las tablas principales encontradas
```

### 2. Verificar Datos

En Supabase Dashboard:
1. Ve a **Table Editor**
2. Selecciona cada tabla
3. Verifica que los datos se hayan importado correctamente

### 3. Probar la Aplicación

- Crear registros nuevos
- Actualizar registros existentes
- Eliminar registros
- Buscar registros
- Subir archivos (si implementaste Storage)

---

## Siguientes Pasos

### ✅ Completado
- [x] Instalación de Supabase client
- [x] Adaptación de DatabaseService
- [x] Actualización de BaseModel
- [x] Creación del esquema PostgreSQL

### 📋 Pendiente
- [ ] Adaptar todos los modelos individuales (PersonaModel, ExpedienteModel, etc.)
- [ ] Migrar los datos de SQLite a Supabase
- [ ] Implementar autenticación con Supabase Auth
- [ ] Configurar Supabase Storage para archivos
- [ ] Actualizar controladores si es necesario
- [ ] Actualizar el frontend para manejar errores de Supabase
- [ ] Probar todas las funcionalidades
- [ ] Crear backup de seguridad
- [ ] Deployment

---

## Recursos Útiles

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

## Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs de la consola
2. Verifica las credenciales en `.env`
3. Revisa el esquema en Supabase
4. Consulta la documentación de Supabase

---

## Notas Importantes

- **Backup**: Siempre haz un backup de tu base de datos SQLite antes de migrar
- **Testing**: Prueba en un proyecto de Supabase de desarrollo primero
- **RLS**: Ajusta las políticas de Row Level Security según tus necesidades
- **Performance**: PostgreSQL puede ser más rápido para consultas complejas
- **Costos**: Supabase es gratis hasta 500MB de base de datos y 1GB de Storage

---

Creado el: 2025-11-13
Rama: `migracion-supabase`

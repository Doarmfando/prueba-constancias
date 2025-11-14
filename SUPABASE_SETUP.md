# 🔧 Configuración de Supabase

Este documento explica cómo configurar Supabase para ejecutar el proyecto **Sistema de Constancias**.

## 📋 Pasos de Configuración

### 1. Configuración de Variables de Entorno

El archivo `.env` ya está configurado con tus credenciales de Supabase:

```env
SUPABASE_URL=https://mbpzwgkqbluavfbtwewk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Crear el Esquema en Supabase

Ejecuta el script SQL en tu dashboard de Supabase:

**Opción A: Desde el SQL Editor de Supabase**

1. Ve a https://app.supabase.com/
2. Selecciona tu proyecto: `mbpzwgkqbluavfbtwewk`
3. Abre **SQL Editor**
4. Copia el contenido de `supabase/migrations/20250114_init_schema.sql`
5. Pega el SQL en el editor
6. Ejecuta (**Run**)

**Opción B: Usando Supabase CLI (si está instalado)**

```bash
supabase db push
```

### 3. Crear Primer Usuario

Una vez creado el esquema, crea un usuario administrador:

```sql
INSERT INTO usuarios (nombre, nombre_usuario, email, password_hash, rol, activo)
VALUES (
  'Admin',
  'admin',
  'admin@sistema-constancias.com',
  '$2b$10$...',  -- Hash bcrypt de tu contraseña
  'administrador',
  true
);
```

### 4. Inicializar Datos Básicos

Los estados se crean automáticamente. Se insertarán:
- Recibido
- En Caja
- Entregado
- Tesoreria

### 5. Configurar Storage (para documentos)

Para almacenar documentos de personas:

1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `documentos-persona`
3. Configura las políticas de acceso según sea necesario

## 📊 Estructura del Esquema

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Usuarios del sistema |
| `personas` | Personas que solicitan constancias |
| `expedientes` | Expedientes de constancias |
| `estados` | Estados de los expedientes |
| `proyectos_registros` | Proyectos para agrupar registros |
| `registros` | Registros de expedientes |
| `documentos_persona` | Documentos adjuntos |
| `auditoria` | Log de auditoría |

### Índices

Se crean automáticamente para optimizar consultas:
- Búsquedas por DNI
- Búsquedas por proyecto
- Búsquedas por fecha
- Búsquedas por usuario

### Triggers

Todos los campos `updated_at` se actualizan automáticamente mediante triggers.

## 🔐 Seguridad - Row Level Security (RLS)

El esquema incluye RLS habilitado en todas las tablas. Actualmente está configurado en modo permisivo para desarrollo.

**⚠️ Importante para Producción:**

Ajusta las políticas RLS según tu modelo de seguridad:

```sql
-- Ejemplo: Permitir que un usuario solo vea sus registros
CREATE POLICY "Ver propios registros" ON registros
  FOR SELECT USING (usuario_creador_id = auth.uid());

-- Ejemplo: Permitir que administradores vean todo
CREATE POLICY "Admins ven todo" ON registros
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'administrador')
  );
```

## 🚀 Ejecutar el Proyecto

Una vez configurado Supabase:

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Release (crear ejecutable)
npm run release
```

## 🧪 Verificar Conexión

Puedes verificar que la conexión funciona ejecutando:

```bash
node test-supabase-connection.js
```

## ✅ Checklist de Configuración

- [ ] Variables de entorno configuradas en `.env`
- [ ] Esquema SQL ejecutado en Supabase
- [ ] Usuario administrador creado
- [ ] Bucket de storage creado (opcional)
- [ ] RLS verificadas y ajustadas para producción
- [ ] Conexión probada exitosamente
- [ ] `npm install` completado
- [ ] Aplicación ejecutándose en `npm run dev`

## 🔗 Enlaces Útiles

- [Dashboard Supabase](https://app.supabase.com/)
- [Documentación Supabase](https://supabase.com/docs)
- [SQL Editor Supabase](https://app.supabase.com/project/mbpzwgkqbluavfbtwewk/editor)

---

**Nota:** Si tienes problemas, verifica que las credenciales en `.env` coincidan exactamente con las del dashboard de Supabase.

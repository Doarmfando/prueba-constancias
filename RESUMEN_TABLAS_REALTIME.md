# 📋 Resumen: Tablas Configuradas para Realtime

## ✅ Tablas del Sistema

Tu sistema tiene las siguientes **7 tablas** configuradas para Supabase Realtime:

| # | Tabla | Eventos | Descripción |
|---|-------|---------|-------------|
| 1 | `personas` | INSERT, UPDATE, DELETE | Gestión de personas |
| 2 | `usuarios` | INSERT, UPDATE, DELETE | Gestión de usuarios del sistema |
| 3 | `expedientes` | INSERT, UPDATE, DELETE | Expedientes de constancias |
| 4 | `registros` | INSERT, UPDATE, DELETE | Registros de constancias |
| 5 | `documentos_persona` | INSERT, UPDATE, DELETE | Documentos adjuntos a personas |
| 6 | `auditoria` | INSERT | Registro de auditoría del sistema |
| 7 | `proyectos_registro` | INSERT, UPDATE, DELETE | Relación entre proyectos y registros |

---

## 🚀 Activación Rápida

### Opción 1: Ejecutar Script SQL Completo

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre **SQL Editor**
3. Ejecuta el archivo: `supabase-realtime-setup.sql`

### Opción 2: Solo Activar Realtime (sin RLS)

Si **NO necesitas** políticas de seguridad RLS por ahora, ejecuta solo esto:

```sql
-- Agregar todas las tablas a Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE personas;
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
ALTER PUBLICATION supabase_realtime ADD TABLE registros;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos_persona;
ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
ALTER PUBLICATION supabase_realtime ADD TABLE proyectos_registro;

-- Verificar
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Resultado esperado:**
```
 tablename
-------------------
 auditoria
 documentos_persona
 expedientes
 personas
 proyectos_registro
 registros
 usuarios
(7 rows)
```

---

## 🔐 ¿Necesito RLS (Row Level Security)?

### ❌ NO necesitas RLS si:
- Estás en desarrollo/pruebas
- Todos los usuarios pueden ver todos los datos
- Tu backend ya maneja la seguridad

**En este caso:** Solo ejecuta los comandos `ALTER PUBLICATION` de arriba y listo.

### ✅ SÍ necesitas RLS si:
- Estás en producción
- Los usuarios solo deben ver sus propios datos
- Necesitas seguridad a nivel de base de datos

**En este caso:** Ejecuta el script SQL completo `supabase-realtime-setup.sql`

---

## ✅ Verificación Simple

### Paso 1: Verificar que Realtime está activo

```sql
SELECT
  tablename,
  schemaname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Deberías ver **7 tablas** listadas.

### Paso 2: Probar en la aplicación

1. Ejecuta: `npm run web`
2. Abre la app en el navegador
3. Ve a la página de "Personas"
4. Deberías ver el badge **"🟢 En vivo"**

### Paso 3: Prueba con dos pestañas

1. Abre dos pestañas del navegador
2. En la primera, ve a "Personas"
3. En la segunda, agrega una nueva persona
4. La primera pestaña se actualizará automáticamente

---

## 📝 Script Mínimo para Activar Realtime

Si solo quieres activar Realtime SIN políticas de seguridad:

```sql
-- ==========================================
-- ACTIVAR REALTIME - VERSIÓN SIMPLE
-- ==========================================

-- Agregar tablas a Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE personas;
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
ALTER PUBLICATION supabase_realtime ADD TABLE registros;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos_persona;
ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
ALTER PUBLICATION supabase_realtime ADD TABLE proyectos_registro;

-- Verificar
SELECT
  'Tabla: ' || tablename || ' - ✅ Realtime activo' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Mensaje final
DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';

  IF total = 7 THEN
    RAISE NOTICE '✅ ÉXITO: Todas las 7 tablas están en Realtime';
  ELSE
    RAISE WARNING '⚠️ Solo % de 7 tablas en Realtime', total;
  END IF;
END $$;
```

---

## 🎯 Estado Actual

### Componentes con Realtime Activo:
- ✅ **Personas** (`src/pages/Personas.jsx`)
- ✅ **Proyectos Públicos** (`src/pages/ProyectosPublicos.jsx`)

### Tablas Listas para Usar:
- ⏳ `usuarios` - Solo agrega el hook
- ⏳ `expedientes` - Solo agrega el hook
- ⏳ `registros` - Solo agrega el hook
- ⏳ `documentos_persona` - Solo agrega el hook
- ⏳ `auditoria` - Solo agrega el hook
- ⏳ `proyectos_registro` - Solo agrega el hook

---

## 🔧 Próximos Pasos

1. **Ejecuta el script SQL** (opción 1 o 2 de arriba)
2. **Inicia la app web**: `npm run web`
3. **Verifica el badge "En vivo"** en Personas
4. **Prueba con dos pestañas**
5. **Agrega Realtime a otros componentes** según necesites

---

## 💡 Resumen Ultra-Rápido

**¿Qué hacer?**
1. Copia y pega esto en Supabase SQL Editor:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE personas;
   ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
   ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
   ALTER PUBLICATION supabase_realtime ADD TABLE registros;
   ALTER PUBLICATION supabase_realtime ADD TABLE documentos_persona;
   ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
   ALTER PUBLICATION supabase_realtime ADD TABLE proyectos_registro;
   ```

2. Ejecuta el comando
3. Listo ✅

**¿Funciona?**
- Abre la app: `npm run web`
- Ve a "Personas"
- Verás el badge "🟢 En vivo"

**¡Eso es todo!** 🎉

# Scripts de Utilidad - Sistema de Constancias

## 📜 Scripts Disponibles

### 1. **test-auth-flow.js** - Pruebas de Autenticación

Prueba el flujo completo de autenticación con Supabase.

**Qué hace:**
- ✅ Crea un usuario de prueba
- ✅ Verifica que se cree en Auth y en la tabla usuarios
- ✅ Prueba login con email
- ✅ Prueba cambio de contraseña
- ✅ Prueba logout
- ✅ Limpia datos de prueba

**Cómo usar:**
```bash
node test-auth-flow.js
```

---

### 2. **vaciar-supabase.js** - Limpiar Base de Datos (Interactivo)

Script interactivo para vaciar todos los datos de Supabase.

**Qué hace:**
- 🗑️ Elimina todos los registros de todas las tablas
- 🔐 Opción para mantener usuarios administradores
- 🗑️ Elimina usuarios de Auth también
- 🔄 Opción para resetear IDs autoincrementales

**Cómo usar:**
```bash
node vaciar-supabase.js
```

**Proceso:**
1. Te pedirá confirmación (debes escribir "SI" en mayúsculas)
2. Te preguntará si quieres mantener admins
3. Eliminará todos los datos en orden correcto
4. Te preguntará si quieres resetear IDs

**⚠️ IMPORTANTE:**
- Esta acción NO se puede deshacer
- Se recomienda hacer backup antes
- Elimina datos tanto de tablas como de Auth

---

### 3. **vaciar-supabase.sql** - Limpiar Base de Datos (SQL Directo)

Script SQL para ejecutar directamente en Supabase SQL Editor.

**Qué hace:**
- 🗑️ Elimina todos los registros usando SQL puro
- 🔄 Resetea secuencias de IDs
- 📊 Muestra conteo de datos restantes

**Cómo usar:**

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Abre SQL Editor
3. Copia y pega el contenido de `vaciar-supabase.sql`
4. Ejecuta

**Opciones disponibles en el archivo:**

**OPCIÓN 1 (Por defecto):** Eliminar todo incluyendo usuarios
```sql
DELETE FROM auditoria;
DELETE FROM registros;
-- ... etc
```

**OPCIÓN 2:** Eliminar todo excepto administradores
```sql
-- Descomentar esta sección
DELETE FROM usuarios WHERE rol = 'trabajador';
```

**OPCIÓN 3:** Eliminar solo datos operativos (mantener usuarios y proyectos)
```sql
-- Descomentar esta sección
DELETE FROM personas;
DELETE FROM expedientes;
-- ... etc
```

**⚠️ NOTA:** Este script SQL **NO** elimina usuarios de `auth.users`. Para eso debes:
- Usar el script `vaciar-supabase.js`, o
- Eliminarlos manualmente desde el dashboard de Supabase

---

## 🔧 Configuración Requerida

Todos los scripts requieren que tengas configurado el archivo `.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
```

---

## 📋 Orden de Eliminación de Datos

Los scripts eliminan en este orden para respetar las foreign keys:

1. `auditoria` - Registros de auditoría
2. `registros` - Registros de expedientes
3. `documentos_persona` - Documentos adjuntos
4. `proyectos_registros` - Proyectos
5. `expedientes` - Expedientes
6. `personas` - Personas
7. `usuarios` - Usuarios (si aplica)

---

## ⚙️ Funcionalidades Adicionales

### Login por Nombre de Usuario

El sistema ahora soporta login tanto con **email** como con **nombre de usuario**.

**Cómo funciona:**
```javascript
// Antes (solo email)
await usuarioModel.autenticar('usuario@email.com', 'password');

// Ahora (email O nombre de usuario)
await usuarioModel.autenticar('usuario@email.com', 'password');  // ✅ Email
await usuarioModel.autenticar('mi_usuario', 'password');         // ✅ Nombre de usuario
```

**Flujo interno:**
1. Si el input **NO contiene @**, se asume que es nombre de usuario
2. Se busca el email asociado en la tabla `usuarios`
3. Se usa el email encontrado para autenticar en Supabase Auth
4. Se retorna el usuario con todos sus datos

**Archivo modificado:** `src/main/models/UsuarioModel.js:71-131`

---

## 🧪 Casos de Uso Comunes

### Desarrollo: Resetear Base de Datos

```bash
# 1. Vaciar todos los datos
node vaciar-supabase.js
# Responder: SI
# Mantener admins: n
# Resetear IDs: s

# 2. Crear usuario admin inicial
# (Usar la interfaz de la aplicación)
```

### Testing: Limpiar después de pruebas

```bash
# Solo eliminar datos operativos (mantener usuarios)
# Editar vaciar-supabase.sql y usar OPCIÓN 3
# Ejecutar en Supabase SQL Editor
```

### Producción: Mantener admins

```bash
# Vaciar pero mantener administradores
node vaciar-supabase.js
# Responder: SI
# Mantener admins: s
# Resetear IDs: n  (recomendado en producción)
```

---

## 🔒 Seguridad

**Scripts con Service Role Key:**
- `vaciar-supabase.js` - Usa `supabaseAdmin`
- `test-auth-flow.js` - Usa `supabaseAdmin`

**⚠️ Nunca ejecutes estos scripts en producción sin confirmación**

**Backups recomendados:**
1. Exportar datos desde Supabase antes de vaciar
2. Usar snapshots de base de datos si disponible
3. Mantener respaldo de usuarios administradores

---

## 📊 Verificar Datos

Después de vaciar, puedes verificar con SQL:

```sql
SELECT
  'personas' as tabla, COUNT(*) as total FROM personas
UNION ALL
SELECT 'expedientes', COUNT(*) FROM expedientes
UNION ALL
SELECT 'registros', COUNT(*) FROM registros
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
ORDER BY tabla;
```

---

## 🆘 Solución de Problemas

### Error: "Database error deleting user"

**Causa:** Supabase no permite eliminar usuarios de Auth desde el cliente admin en algunos casos.

**Solución:**
1. Ir al dashboard de Supabase: https://supabase.com/dashboard
2. Navegar a Authentication > Users
3. Eliminar manualmente los usuarios

### Error: "Cannot delete due to foreign key constraint"

**Causa:** Intentaste eliminar en orden incorrecto.

**Solución:** Usa los scripts proporcionados que eliminan en el orden correcto.

### Error: "Permission denied"

**Causa:** RLS podría estar bloqueando la eliminación.

**Solución:** Los scripts usan `supabaseAdmin` que bypasea RLS. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté correcta.

---

## 📝 Notas Adicionales

1. **Estados:** La tabla `estados` NO se vacía porque contiene datos de configuración
2. **Cascada:** Algunos borrados en tablas relacionadas se hacen automáticamente por `ON DELETE CASCADE`
3. **Secuencias:** Resetear IDs es opcional y solo afecta nuevos registros
4. **Auth vs Tabla:** Los usuarios existen en DOS lugares:
   - `auth.users` (Supabase Auth)
   - `usuarios` (Tu tabla)

   Ambos deben eliminarse para limpiar completamente.

---

## ✅ Checklist Antes de Vaciar Producción

- [ ] Hacer backup de la base de datos
- [ ] Notificar a usuarios (si aplica)
- [ ] Verificar que tienes acceso a credenciales de admin
- [ ] Confirmar que tienes el archivo `.env` correcto
- [ ] Ejecutar en horario de bajo tráfico
- [ ] Tener plan de recuperación si algo falla

---

**Última actualización:** 2025-11-15

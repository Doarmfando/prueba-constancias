# 🔐 Migración a Supabase Auth

Esta guía documenta la integración completa de Supabase Authentication en el sistema de constancias.

## 📋 Tabla de Contenidos

1. [Resumen de Cambios](#-resumen-de-cambios)
2. [Arquitectura](#-arquitectura)
3. [Cambios en la Base de Datos](#-cambios-en-la-base-de-datos)
4. [Cambios en el Código](#-cambios-en-el-código)
5. [Proceso de Migración](#-proceso-de-migración)
6. [Uso del Nuevo Sistema](#-uso-del-nuevo-sistema)
7. [Preguntas Frecuentes](#-preguntas-frecuentes)

---

## 🎯 Resumen de Cambios

### ¿Qué cambió?

**ANTES:**
- Autenticación personalizada con `password_hash` en tabla `usuarios`
- Contraseñas hasheadas con SHA-256
- Login con `nombre_usuario` y `password`

**AHORA:**
- Autenticación usando **Supabase Auth**
- No más `password_hash` en la BD
- Nueva columna `auth_id` vinculada a `auth.users`
- Login con `email` y `password`
- Row Level Security (RLS) usando `auth.uid()`

### Ventajas

✅ **Seguridad mejorada**: Supabase maneja passwords con bcrypt
✅ **Funcionalidades adicionales**: Reset de password, verificación de email, 2FA
✅ **Mejor seguridad**: RLS nativo de Supabase
✅ **Menos código**: No necesitas mantener lógica de autenticación
✅ **Escalabilidad**: Sistema probado y mantenido por Supabase

---

## 🏗️ Arquitectura

### Flujo de Autenticación

```
┌─────────────────┐
│  Usuario ingresa│
│  email/password │
└────────┬────────┘
         │
         v
┌─────────────────────────────┐
│  Supabase Auth              │
│  supabase.auth.signIn()     │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  auth.users (Supabase)      │
│  - id (UUID)                │
│  - email                    │
│  - encrypted_password       │
└────────┬────────────────────┘
         │ auth_id (FK)
         v
┌─────────────────────────────┐
│  public.usuarios            │
│  - id (BIGSERIAL)           │
│  - auth_id (UUID) ──────────┘
│  - nombre                   │
│  - rol                      │
│  - activo                   │
└─────────────────────────────┘
```

### Sincronización Automática

Cuando un usuario se registra en Supabase Auth, un **trigger** automáticamente crea el registro correspondiente en `public.usuarios`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 💾 Cambios en la Base de Datos

### Esquema Actualizado

#### Tabla `usuarios` (NUEVO)

```sql
CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- ✨ NUEVO
  nombre TEXT NOT NULL,
  nombre_usuario TEXT,
  email TEXT UNIQUE,
  -- password_hash TEXT NOT NULL,  ❌ ELIMINADO
  rol TEXT CHECK(rol IN ('administrador', 'trabajador')) DEFAULT 'trabajador',
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_id)
);
```

#### Funciones Auxiliares

```sql
-- Obtener ID del usuario actual desde auth.uid()
CREATE FUNCTION get_current_user_id()
RETURNS BIGINT AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verificar si el usuario es admin
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_id = auth.uid() AND rol = 'administrador' AND activo = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### Row Level Security (RLS)

Todas las políticas ahora usan `auth.uid()`:

```sql
-- Ejemplo: Usuarios pueden verse entre sí si están autenticados
CREATE POLICY "usuarios_select_policy" ON usuarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admins pueden crear usuarios
CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_id = auth.uid() AND rol = 'administrador'
    )
  );
```

---

## 💻 Cambios en el Código

### UsuarioModel.js

#### Crear Usuario (ANTES vs AHORA)

**ANTES:**
```javascript
async crear(datos) {
  const passwordHash = this.hashPassword(password);
  const usuario = await this.create({
    nombre, email, password_hash: passwordHash, rol
  });
  return usuario.id;
}
```

**AHORA:**
```javascript
async crear(datos) {
  // 1. Crear en Supabase Auth
  const { data: authData } = await this.db.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, nombre_usuario, rol }
    }
  });

  // 2. El trigger crea automáticamente el registro en usuarios
  // 3. Obtener el usuario creado
  const { data: usuario } = await this.db
    .from('usuarios')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single();

  return usuario.id;
}
```

#### Autenticar (ANTES vs AHORA)

**ANTES:**
```javascript
async autenticar(nombre_usuario, password) {
  const { data: usuarios } = await this.db
    .from('usuarios')
    .select('*')
    .eq('nombre_usuario', nombre_usuario)
    .eq('activo', true);

  const usuario = usuarios[0];
  if (!this.verificarPassword(password, usuario.password_hash)) {
    throw new Error('Contraseña incorrecta');
  }

  return usuario;
}
```

**AHORA:**
```javascript
async autenticar(email, password) {
  // 1. Autenticar con Supabase Auth
  const { data: authData } = await this.db.auth.signInWithPassword({
    email,
    password
  });

  // 2. Obtener datos del usuario desde la tabla usuarios
  const { data: usuario } = await this.db
    .from('usuarios')
    .select('*')
    .eq('auth_id', authData.user.id)
    .eq('activo', true)
    .single();

  return usuario;
}
```

#### Cambiar Contraseña (ANTES vs AHORA)

**ANTES:**
```javascript
async cambiarPassword(id, passwordAnterior, passwordNuevo) {
  // Verificar password anterior
  const { data: usuario } = await this.db
    .from('usuarios')
    .select('password_hash')
    .eq('id', id)
    .single();

  if (!this.verificarPassword(passwordAnterior, usuario.password_hash)) {
    throw new Error('Contraseña anterior incorrecta');
  }

  const nuevoHash = this.hashPassword(passwordNuevo);
  await this.update(id, { password_hash: nuevoHash });
}
```

**AHORA:**
```javascript
async cambiarPassword(id, passwordNuevo) {
  // Obtener auth_id
  const { data: usuario } = await this.db
    .from('usuarios')
    .select('auth_id')
    .eq('id', id)
    .single();

  // Actualizar en Supabase Auth
  await this.db.auth.admin.updateUserById(
    usuario.auth_id,
    { password: passwordNuevo }
  );
}
```

### AuthController.js

**Login ahora usa email en lugar de nombre_usuario:**

```javascript
// ANTES
async login(nombre_usuario, password) { ... }

// AHORA
async login(email, password) { ... }
```

---

## 🚀 Proceso de Migración

### Opción 1: Base de Datos Nueva (Recomendado)

Si estás empezando un proyecto nuevo o puedes recrear la BD:

1. **Ejecuta el nuevo schema:**
   ```bash
   # En el SQL Editor de Supabase, ejecuta:
   supabase-schema.sql
   ```

2. **Aplica las políticas RLS:**
   ```bash
   supabase-rls-custom.sql
   ```

3. **Crea el primer administrador:**
   ```bash
   node migrate-usuarios-to-auth.js --admin
   ```

   Esto crea:
   - Email: `admin@ejemplo.com`
   - Password: `Admin123!`

4. **¡Listo!** Ya puedes iniciar sesión con el admin.

---

### Opción 2: Migrar Usuarios Existentes

Si ya tienes usuarios en tu BD actual:

#### Paso 1: Agregar columna `auth_id`

```sql
ALTER TABLE usuarios
ADD COLUMN auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_usuarios_auth_id ON usuarios(auth_id);
```

#### Paso 2: Eliminar columna `password_hash`

⚠️ **IMPORTANTE**: Guarda un backup antes de hacer esto.

```sql
-- Backup
CREATE TABLE usuarios_backup AS SELECT * FROM usuarios;

-- Eliminar columna
ALTER TABLE usuarios DROP COLUMN password_hash;
```

#### Paso 3: Aplicar funciones y triggers

```sql
-- Ejecuta las secciones de supabase-schema.sql:
-- - SINCRONIZACIÓN CON SUPABASE AUTH
-- - handle_new_user()
-- - get_current_user_id()
-- - is_admin()
```

#### Paso 4: Actualizar políticas RLS

```bash
# Ejecuta en SQL Editor:
supabase-rls-custom.sql
```

#### Paso 5: Migrar usuarios existentes

```bash
node migrate-usuarios-to-auth.js
```

Este script:
- Lee usuarios de `usuarios` que no tienen `auth_id`
- Crea cada usuario en Supabase Auth
- Asigna contraseña temporal: `CambiarMe123!`
- Vincula con `auth_id`
- Confirma emails automáticamente

**Salida esperada:**
```
🚀 Iniciando migración de usuarios a Supabase Auth...

📊 Encontrados 5 usuarios sin auth_id:

⏳ Procesando: Juan Pérez (juan@example.com)
   📝 Creando en Auth con email: juan@example.com
   ✅ Usuario creado en Auth: abc123-def456-...
   ✅ Migrado correctamente

...

============================================================
📊 RESUMEN DE MIGRACIÓN:
============================================================
✅ Usuarios migrados: 5
❌ Errores: 0
📝 Total procesados: 5
============================================================

⚠️  IMPORTANTE:
   - Todos los usuarios migrados tienen la contraseña temporal: "CambiarMe123!"
   - Se recomienda que cambien sus contraseñas al iniciar sesión
```

#### Paso 6: Notificar a los usuarios

Envía un email a cada usuario indicando:
- Nueva contraseña temporal: `CambiarMe123!`
- Deben cambiarla al iniciar sesión
- Ahora usan su **email** para iniciar sesión

---

## 🎮 Uso del Nuevo Sistema

### Registrar Usuario (desde la app)

```javascript
// En tu código frontend
const datosUsuario = {
  nombre: 'Juan Pérez',
  nombre_usuario: 'jperez',
  email: 'juan@example.com',
  password: 'MiPassword123!',
  rol: 'trabajador'
};

const resultado = await ipcRenderer.invoke('auth:crear-usuario', datosUsuario);
```

Esto:
1. Crea usuario en `auth.users` con email y password
2. El trigger crea automáticamente registro en `usuarios`
3. Retorna el usuario completo

### Iniciar Sesión

```javascript
// AHORA usa EMAIL en lugar de nombre_usuario
const resultado = await ipcRenderer.invoke('auth:login', {
  email: 'juan@example.com',  // ✨ Cambio aquí
  password: 'MiPassword123!'
});

if (resultado.success) {
  console.log('Usuario:', resultado.usuario);
  // {
  //   id: 1,
  //   nombre: 'Juan Pérez',
  //   email: 'juan@example.com',
  //   rol: 'trabajador',
  //   auth_id: 'abc123-...'
  // }
}
```

### Cambiar Contraseña

```javascript
// Admin o el mismo usuario pueden cambiar la contraseña
await ipcRenderer.invoke('auth:cambiar-password', {
  id: usuarioId,
  passwordNuevo: 'NuevoPassword123!'
  // Ya no se requiere passwordAnterior para admins
});
```

### Recuperar Contraseña (Nuevo)

Ahora puedes usar la funcionalidad nativa de Supabase:

```javascript
// En el frontend
const { error } = await supabase.auth.resetPasswordForEmail(
  'usuario@example.com',
  {
    redirectTo: 'https://tu-app.com/reset-password',
  }
);
```

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa con los usuarios que no tienen email?

El script de migración los saltará. Deberás:
1. Asignarles un email manualmente en la BD
2. Ejecutar el script nuevamente

```sql
UPDATE usuarios
SET email = 'usuario@tudominio.com'
WHERE id = 123 AND email IS NULL;
```

### ¿Puedo seguir usando nombre_usuario?

Sí, la columna `nombre_usuario` se mantiene para mostrar en la interfaz. Pero el **login** ahora es con **email**.

### ¿Qué pasa si un usuario olvida su contraseña?

Usa la funcionalidad de reset de Supabase:

```javascript
await supabase.auth.resetPasswordForEmail(email);
```

Supabase enviará un email con un link para resetear.

### ¿Cómo verifico emails de nuevos usuarios?

Por defecto, el script auto-confirma emails. En producción, configura Supabase para enviar emails de confirmación:

**Supabase Dashboard → Authentication → Email Templates → Confirm Signup**

### ¿Puedo deshabilitar el auto-confirm en producción?

Sí, en el código de `crear()`:

```javascript
// Desarrollo (auto-confirm)
const { data } = await this.db.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://tu-app.com/confirm'
  }
});

// El usuario recibirá un email para confirmar
```

### ¿Qué pasa con la auditoría?

La tabla `auditoria` sigue funcionando igual. Usa el `id` de la tabla `usuarios`, no el `auth_id`.

### ¿Cómo obtengo el usuario actual en queries?

Usa las funciones auxiliares:

```sql
-- Obtener ID del usuario actual
SELECT get_current_user_id();

-- Verificar si es admin
SELECT is_admin();

-- Ejemplo en query
SELECT * FROM proyectos_registros
WHERE usuario_creador_id = get_current_user_id();
```

---

## 🔒 Seguridad

### Mejores Prácticas

✅ **Usa HTTPS** en producción
✅ **Configura políticas RLS** correctas
✅ **No expongas SERVICE_ROLE_KEY** en el frontend
✅ **Usa ANON_KEY** en el cliente
✅ **Habilita 2FA** para administradores
✅ **Configura email verification** en producción

### Configuración de Supabase

1. **Dashboard → Authentication → Providers**
   - Habilita/deshabilita proveedores (Google, GitHub, etc.)

2. **Dashboard → Authentication → URL Configuration**
   - Configura redirect URLs permitidos

3. **Dashboard → Authentication → Email Templates**
   - Personaliza emails de confirmación y reset

---

## 📊 Checklist de Migración

- [ ] Backup de la base de datos actual
- [ ] Ejecutar `supabase-schema.sql` (schema nuevo)
- [ ] Ejecutar `supabase-rls-custom.sql` (políticas RLS)
- [ ] Verificar que el trigger `on_auth_user_created` existe
- [ ] Ejecutar `node migrate-usuarios-to-auth.js` (migrar usuarios)
- [ ] Crear usuario admin de prueba
- [ ] Probar login con email y password
- [ ] Verificar que RLS funciona correctamente
- [ ] Notificar usuarios sobre contraseñas temporales
- [ ] Configurar email templates en Supabase
- [ ] Actualizar documentación de usuario

---

## 🆘 Problemas Comunes

### "Auth session missing"

**Causa:** La sesión no se está guardando correctamente.

**Solución:** Verifica que uses `SUPABASE_SERVICE_ROLE_KEY` en el backend.

### "Row level security policy violated"

**Causa:** Las políticas RLS están bloqueando la operación.

**Solución:**
1. Verifica que el usuario esté autenticado
2. Revisa las políticas en `supabase-rls-custom.sql`
3. Temporalmente desactiva RLS para debugging:
   ```sql
   ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
   ```

### "Duplicate key violates unique constraint"

**Causa:** El email ya existe en `auth.users`.

**Solución:** El script de migración maneja esto automáticamente vinculando con el usuario existente.

### "User not found"

**Causa:** El usuario existe en `auth.users` pero no en `usuarios` (o viceversa).

**Solución:**
1. Verifica que el trigger esté activo
2. Crea manualmente el vínculo:
   ```sql
   UPDATE usuarios
   SET auth_id = 'uuid-del-usuario-auth'
   WHERE id = 123;
   ```

---

## 📚 Recursos Adicionales

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

**Última actualización:** 2025-01-14
**Versión:** 2.0.0 (Supabase Auth)

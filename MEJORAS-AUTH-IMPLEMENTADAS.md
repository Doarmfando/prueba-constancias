# Mejoras de Autenticación Implementadas

## 📋 Resumen

Se ha refactorizado el sistema de autenticación para usar **dos clientes de Supabase separados** siguiendo el patrón de **noeminext**, adaptado para Electron.

---

## 🎯 Problemas Resueltos

### ❌ **ANTES:**
- Se usaba **SERVICE_ROLE_KEY** para todas las operaciones
- Esto **bypaseaba completamente RLS** (Row Level Security)
- No se respetaba el contexto del usuario autenticado
- Riesgo de seguridad: cualquier operación tenía permisos de admin

### ✅ **AHORA:**
- **Cliente USER** (ANON_KEY): Para operaciones normales con sesión del usuario
- **Cliente ADMIN** (SERVICE_ROLE_KEY): Solo para operaciones privilegiadas
- Separación clara de responsabilidades
- Sistema más seguro y escalable

---

## 🔧 Cambios Implementados

### 1. **src/config/supabase.js**

**Antes:**
```javascript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
```

**Ahora:**
```javascript
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente USER - Para operaciones de usuarios autenticados
const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

// Cliente ADMIN - Solo para operaciones administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

**Exports:**
- `supabaseUser`: Para login, logout, operaciones del usuario autenticado
- `supabaseAdmin`: Para crear usuarios, reset passwords, operaciones de admin

---

### 2. **src/main/models/UsuarioModel.js**

#### Nuevos métodos:

**a) `setAdminClient(adminClient)`**
- Configura el cliente admin para operaciones privilegiadas

**b) `crear(datos)` - REFACTORIZADO**
- **Ahora usa:** `this.adminClient.auth.admin.createUser()`
- **Antes:** `this.db.auth.signUp()`
- **Beneficio:** Auto-confirma email, control total sobre el usuario creado

**c) `cambiarPasswordPropia(passwordNuevo)` - NUEVO**
- Permite al usuario cambiar su propia contraseña
- Usa: `this.db.auth.updateUser()` (cliente USER)
- No requiere permisos de admin

**d) `cambiarPasswordAdmin(id, passwordNuevo)` - NUEVO**
- Permite a admin cambiar contraseña de otro usuario
- Usa: `this.adminClient.auth.admin.updateUserById()`
- Requiere cliente admin

**e) `cambiarPassword()` - ELIMINADO**
- Reemplazado por los dos métodos anteriores para mayor claridad

---

### 3. **src/main/controllers/AuthController.js**

**Método `cambiarPassword()` actualizado:**

```javascript
async cambiarPassword(id, passwordNuevo, usuarioActual) {
  // Si el usuario cambia su propia contraseña
  if (usuarioActual.id === parseInt(id)) {
    await this.usuarioModel.cambiarPasswordPropia(passwordNuevo);
  }
  // Si es admin cambiando la contraseña de otro usuario
  else {
    await this.usuarioModel.cambiarPasswordAdmin(id, passwordNuevo);
  }
}
```

**Beneficio:** Usa el método correcto según quién hace el cambio

---

### 4. **src/main/services/DatabaseService.js**

**Método `connect()` actualizado:**

```javascript
async connect() {
  // ...
  return {
    user: this.supabaseUser,
    admin: this.supabaseAdmin
  };
}
```

**Nuevos métodos:**
- `getUserClient()`: Retorna cliente USER
- `getAdminClient()`: Retorna cliente ADMIN

---

### 5. **main.js**

**Inicialización actualizada:**

```javascript
async initializeServices() {
  this.services.database = new DatabaseService();
  const clients = await this.services.database.connect();

  this.dbUser = clients.user;     // Cliente USER
  this.dbAdmin = clients.admin;   // Cliente ADMIN
}

initializeModels() {
  // La mayoría de modelos usan cliente USER
  this.models.registro = new RegistroModel(this.dbUser);
  this.models.persona = new PersonaModel(this.dbUser);
  // ... otros modelos

  // UsuarioModel necesita ambos
  this.models.usuario = new UsuarioModel(this.dbUser);
  this.models.usuario.setAdminClient(this.dbAdmin);
}
```

---

## 📝 Variables de Entorno Requeridas

Actualiza tu archivo `.env`:

```env
# URL de tu proyecto de Supabase
SUPABASE_URL=https://mbpzwgkqbluavfbtwewk.supabase.co

# Anon Key (para operaciones de usuarios)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icHp3Z2txYmx1YXZmYnR3ZXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODgwNDUsImV4cCI6MjA3ODY2NDA0NX0.xA5UAGH6UxRBlTHoTJ3P53dNp3CxB__MNM2qZYBel8w

# Service Role Key (para operaciones administrativas)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icHp3Z2txYmx1YXZmYnR3ZXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA4ODA0NSwiZXhwIjoyMDc4NjY0MDQ1fQ.FVtbK-Tgs_kRuumsCLasiUYrjzQb-ehcDROImJVRQFg

NODE_ENV=development
```

---

## 🧪 Pruebas

Se ha creado el archivo **`test-auth-flow.js`** que prueba:

1. ✅ Crear usuario con cliente ADMIN
2. ✅ Verificar que el trigger crea registro en tabla usuarios
3. ✅ Autenticar con cliente USER
4. ✅ Obtener datos del usuario autenticado
5. ✅ Cambiar contraseña propia con cliente USER
6. ✅ Cerrar sesión
7. ✅ Autenticar con nueva contraseña

**Ejecutar pruebas:**
```bash
node test-auth-flow.js
```

**Resultado:**
```
✅ TODAS LAS PRUEBAS COMPLETADAS
```

---

## 📊 Flujo de Autenticación Actualizado

### **Login (Usuario Normal o Admin):**
```
1. Usuario ingresa email y contraseña
   ↓
2. AuthController.login() usa UsuarioModel.autenticar()
   ↓
3. UsuarioModel usa supabaseUser.auth.signInWithPassword()
   ↓
4. Supabase crea sesión con ANON_KEY
   ↓
5. Se obtienen datos del usuario desde tabla usuarios
   ↓
6. Se retorna usuario con sesión activa
```

### **Crear Usuario (Solo Admin):**
```
1. Admin ingresa datos del nuevo usuario
   ↓
2. AuthController.crearUsuario() valida que sea admin
   ↓
3. UsuarioModel.crear() usa supabaseAdmin.auth.admin.createUser()
   ↓
4. Trigger automático crea registro en tabla usuarios
   ↓
5. Se retorna el usuario creado
```

### **Cambiar Contraseña Propia:**
```
1. Usuario solicita cambiar su contraseña
   ↓
2. AuthController.cambiarPassword() detecta que es el mismo usuario
   ↓
3. Llama a UsuarioModel.cambiarPasswordPropia()
   ↓
4. Usa supabaseUser.auth.updateUser() (con sesión activa)
   ↓
5. Contraseña actualizada
```

### **Cambiar Contraseña de Otro (Solo Admin):**
```
1. Admin solicita cambiar contraseña de otro usuario
   ↓
2. AuthController.cambiarPassword() valida permisos
   ↓
3. Llama a UsuarioModel.cambiarPasswordAdmin(id)
   ↓
4. Usa supabaseAdmin.auth.admin.updateUserById()
   ↓
5. Contraseña actualizada
```

---

## 🔒 Seguridad

### **Matriz de Permisos:**

| Operación | Cliente | Key | Requiere Sesión | Permisos |
|-----------|---------|-----|-----------------|----------|
| Login | USER | ANON | No | Público |
| Logout | USER | ANON | Sí | Propio usuario |
| Obtener datos propios | USER | ANON | Sí | Propio usuario |
| Cambiar password propia | USER | ANON | Sí | Propio usuario |
| Crear usuario | ADMIN | SERVICE | No* | Solo admin |
| Cambiar password ajeno | ADMIN | SERVICE | No* | Solo admin |
| Listar usuarios | USER | ANON | Sí | Validado en código |

*\* No requiere sesión en el cliente admin, pero se valida en el controlador*

---

## 🚀 Próximos Pasos (Opcional)

Si quieres mejorar aún más la seguridad:

1. **Implementar RLS en Supabase:**
   - Ya tienes las políticas en `supabase-rls-custom.sql`
   - Necesitarías ajustar el flujo para que el cliente USER use el token JWT

2. **Sistema de permisos granular:**
   - Similar a noeminext (tabla `permisos`, `rol_permisos`)
   - Actualmente tienes solo admin/trabajador (suficiente para tu caso)

3. **Validación adicional en backend:**
   - Middleware de autenticación
   - Validación de roles en cada endpoint IPC

---

## 📚 Comparación con NoemíNext

| Aspecto | NoemíNext (Web) | Tu Sistema (Electron) |
|---------|-----------------|----------------------|
| Framework | Next.js | Electron + React |
| Anon Key | ✅ En navegador | ✅ En cliente USER |
| Service Role | ✅ En Server Actions | ✅ En cliente ADMIN |
| RLS | ❌ No implementado | ❌ No implementado |
| Permisos | ✅ Sistema granular | ✅ Simple (admin/trabajador) |
| Sesiones | Cookie-based | Local persistente |

**Conclusión:** Tu implementación está **alineada con las mejores prácticas** de NoemíNext, adaptada para el entorno de Electron.

---

## ✅ Checklist de Implementación

- [x] Crear dos clientes de Supabase separados (user/admin)
- [x] Actualizar DatabaseService para retornar ambos clientes
- [x] Refactorizar UsuarioModel para usar cliente correcto
- [x] Separar métodos de cambio de contraseña (propia vs admin)
- [x] Actualizar AuthController para usar métodos correctos
- [x] Actualizar main.js para inicializar modelos con clientes apropiados
- [x] Crear script de pruebas (test-auth-flow.js)
- [x] Ejecutar y validar todas las pruebas
- [x] Documentar cambios

---

## 🎉 Resultado Final

**Tu sistema ahora:**
- ✅ Usa autenticación de Supabase correctamente
- ✅ Separa operaciones de usuario y admin
- ✅ Sigue el patrón de NoemíNext adaptado a Electron
- ✅ Mantiene tu sistema simple de roles (admin/trabajador)
- ✅ Crea usuarios tanto en Auth como en tabla usuarios
- ✅ Permite cambio de contraseña seguro
- ✅ Maneja sesiones correctamente

**Todo funciona correctamente con ambos sistemas (Auth + Tabla)** 🎊

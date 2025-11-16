# Cómo Cambiar entre Modo Electron y Modo Web

Tu proyecto ahora tiene **dos ramas** con dos implementaciones diferentes:

## 📋 Resumen de Ramas

| Rama | Modo | Descripción |
|------|------|-------------|
| `main` | Electron + Web híbrido | Versión original con Electron + mejoras para Supabase Storage |
| `web-mode` | 100% Web | Sin dependencias de Electron, todo corre en navegador |

---

## 🔀 Cambiar entre Ramas

### Ver rama actual
```bash
git branch
```

### Cambiar a modo Electron (rama `main`)
```bash
git checkout main
```

Luego ejecuta:
```bash
npm run dev
```

### Cambiar a modo Web (rama `web-mode`)
```bash
git checkout web-mode
```

Luego ejecuta:
```bash
npm run web
```

**O por separado:**
```bash
# Terminal 1: Frontend
npm start

# Terminal 2: Backend
npm run server
```

---

## 🚀 Ejecutar cada Modo

### Modo Electron (rama `main`)

1. Asegúrate de estar en `main`:
   ```bash
   git checkout main
   ```

2. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

3. Se abrirá la ventana de Electron

**Características:**
- ✅ Aplicación de escritorio nativa
- ✅ Soporta archivos locales y Supabase
- ✅ Puede trabajar offline (parcialmente)
- ⚠️ Requiere instalación en cada PC

---

### Modo Web (rama `web-mode`)

1. Asegúrate de estar en `web-mode`:
   ```bash
   git checkout web-mode
   ```

2. **Opción A - Todo junto:**
   ```bash
   npm run web
   ```

   **Opción B - Por separado:**

   Terminal 1:
   ```bash
   npm start
   ```

   Terminal 2:
   ```bash
   npm run server
   ```

3. Abre el navegador en:
   - Frontend: `http://localhost:8083`
   - API: `http://localhost:3001/api`

**Características:**
- ✅ Sin instalación, solo navegador
- ✅ Acceso desde cualquier PC en la red
- ✅ Todos los archivos en Supabase (nube)
- ✅ Actualizaciones instantáneas
- ⚠️ Requiere conexión a internet
- ⚠️ No soporta archivos locales

---

## 🌐 Acceder desde otra PC (solo modo Web)

### En la PC donde corre el servidor:

1. Obtén tu IP local:
   ```bash
   ipconfig
   ```

   Busca "Dirección IPv4", ejemplo: `192.168.1.100`

2. Inicia el servidor:
   ```bash
   npm run web
   ```

### En la otra PC:

1. Abre el navegador

2. Ve a:
   ```
   http://192.168.1.100:8083
   ```

   (Reemplaza `192.168.1.100` con tu IP)

3. ¡Listo! La aplicación debería cargar

---

## ⚙️ Configuración Necesaria

### Ambos Modos

Asegúrate de tener el archivo `.env` con:

```env
SUPABASE_URL=https://mbpzwgkqbluavfbtwewk.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NODE_ENV=development
```

### Solo Modo Web

Si quieres cambiar el puerto del servidor (opcional):

```env
PORT=3002
```

Y actualiza las llamadas del frontend al nuevo puerto.

---

## 🔧 Solución de Problemas

### "Cannot find module..."

Reinstala dependencias:
```bash
npm install
```

### El servidor no inicia (modo web)

1. Verifica que no haya otro proceso en el puerto 3001:
   ```bash
   netstat -ano | findstr :3001
   ```

2. Si hay un proceso, mátalo o cambia el puerto en `.env`

### "CORS error" (modo web)

El servidor ya tiene CORS habilitado, pero si ves este error:

1. Verifica que frontend y backend estén corriendo
2. Verifica las URLs en las llamadas

### Los archivos no se suben

1. Verifica credenciales de Supabase en `.env`
2. Verifica que el bucket 'Archivos' existe en Supabase
3. Verifica las políticas RLS con:
   ```sql
   SELECT policyname FROM pg_policies
   WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

---

## 📝 Diferencias entre Ramas

### Código que cambió en `web-mode`:

1. **`server.js`**
   - Cambiado `HybridStorageService` → `StorageService`
   - Usa `DocumentoPersonaControllerWeb` en lugar de `DocumentoPersonaController`

2. **`DocumentoPersonaControllerWeb.js`** (NUEVO)
   - Sin dependencias de Electron
   - Solo usa Supabase Storage
   - Perfecto para modo web

3. **Comportamiento:**
   - `main`: Intenta Supabase → si falla, guarda local
   - `web-mode`: Solo Supabase, no hay fallback local

---

## 💾 Guardar cambios antes de cambiar de rama

Si hiciste cambios y quieres cambiar de rama:

```bash
# Opción 1: Commit de cambios
git add .
git commit -m "Mis cambios"

# Opción 2: Guardar temporalmente (stash)
git stash

# Cambia de rama
git checkout otra-rama

# Si usaste stash, recupera tus cambios
git stash pop
```

---

## 🎯 Recomendación

- **Desarrollo:** Usa `web-mode` (más rápido, no necesitas Electron)
- **Producción:** Depende de tu caso:
  - Si necesitas trabajo offline → Electron (`main`)
  - Si quieres acceso multi-PC → Web (`web-mode`)

---

## ❓ Preguntas Frecuentes

### ¿Puedo mergear los cambios de web-mode a main?

Sí, pero con cuidado:
```bash
git checkout main
git merge web-mode
```

Puede haber conflictos en `server.js` y los controllers.

### ¿Puedo tener ambos modos al mismo tiempo?

Técnicamente sí, pero no es recomendado. Es mejor elegir uno.

### ¿Los datos en Supabase son los mismos?

Sí, ambas ramas usan la misma BD y Storage de Supabase.

### ¿Qué pasa con los archivos locales si cambio a web-mode?

Los archivos con `ubicacion_almacenamiento='LOCAL'` no estarán disponibles en modo web. Solo los de Supabase funcionarán.

---

## 📞 Soporte

Si algo no funciona:

1. Verifica que estés en la rama correcta: `git branch`
2. Verifica que las dependencias estén instaladas: `npm install`
3. Verifica los logs del servidor/aplicación
4. Revisa este archivo para troubleshooting

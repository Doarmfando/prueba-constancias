# 🔧 Configuración de Supabase para A30%

Esta guía te ayudará a configurar las credenciales de Supabase correctamente para que la aplicación funcione.

## 📋 Tabla de Contenidos

1. [Problema Común](#-problema-común)
2. [Solución Paso a Paso](#-solución-paso-a-paso)
3. [Configuración para Desarrollo](#-configuración-para-desarrollo)
4. [Configuración para Producción](#-configuración-para-producción)
5. [Verificar Configuración](#-verificar-configuración)
6. [Solución de Problemas](#-solución-de-problemas)

---

## ❌ Problema Común

Si ves este error al ejecutar la aplicación:

```
❌ ERROR: Faltan credenciales de Supabase
Por favor configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env
```

Significa que la aplicación **no puede encontrar o leer** tus credenciales de Supabase.

---

## ✅ Solución Paso a Paso

### 1️⃣ Obtener Credenciales de Supabase

1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Abre tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. Copia los siguientes valores:
   - **Project URL** (ej: `https://abc123xyz.supabase.co`)
   - **service_role key** (⚠️ secret - bajo "Project API keys")

### 2️⃣ Crear Archivo `.env`

**Opción A: Desde .env.example**
```bash
# En la raíz del proyecto:
cp .env.example .env
```

**Opción B: Crear manualmente**
Crea un archivo llamado `.env` en la raíz del proyecto (mismo nivel que `package.json`)

### 3️⃣ Editar `.env` con tus Credenciales

Abre el archivo `.env` y reemplaza los valores de ejemplo:

```env
# ⚠️ REEMPLAZA CON TUS VALORES REALES:
SUPABASE_URL=https://abc123xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci0iIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...
```

**⚠️ IMPORTANTE:**
- NO uses comillas alrededor de los valores
- NO dejes espacios al inicio o final
- Copia y pega directamente desde Supabase
- NO compartas este archivo con nadie

---

## 🔨 Configuración para Desarrollo

### En modo desarrollo (`npm run dev` o `npm run electron`)

El archivo `.env` debe estar en la **raíz del proyecto**:

```
tu-proyecto/
├── .env                 ← AQUÍ
├── .env.example
├── main.js
├── package.json
└── src/
```

### Verificar que funciona:

```bash
npm run electron
```

Deberías ver en la consola:
```
✅ Cargando variables de entorno desde: /ruta/a/tu/proyecto/.env
🔄 Conectando a Supabase...
✅ Conectado a Supabase exitosamente
```

---

## 📦 Configuración para Producción

### Aplicación Empaquetada (`npm run release`)

Cuando empaqueques la aplicación, el archivo `.env` se **incluirá automáticamente** en `extraResources`.

La aplicación buscará `.env` en estos lugares (en orden):

1. `[Recursos de la app]/extraResources/.env`
2. `[Datos de usuario]/.env`
3. `[Directorio del ejecutable]/.env`

### Método Recomendado: Incluir .env en el Build

**Ya configurado** en `package.json`:
```json
"extraResources": [
  {
    "from": "./.env",
    "to": ".env"
  }
]
```

### Método Alternativo: Archivo .env externo

Si prefieres que cada usuario configure sus propias credenciales:

1. **Después de instalar**, copia `.env` a:
   ```
   C:\Users\[TuUsuario]\AppData\Roaming\A30%\.env
   ```

2. O coloca `.env` junto al ejecutable:
   ```
   C:\Program Files\A30%\.env
   ```

---

## 🔍 Verificar Configuración

### Script de Verificación

Ejecuta este comando para probar la conexión:

```bash
node test-supabase-connection.js
```

### Verificación Manual

1. Abre la aplicación
2. Abre DevTools (Ctrl+Shift+I)
3. Ve a la pestaña **Console**
4. Busca mensajes como:
   ```
   ✅ Cargando variables de entorno desde: ...
   ✅ Conectado a Supabase exitosamente
   ```

---

## 🚨 Solución de Problemas

### Error: "No se encontró archivo .env"

**Causa:** El archivo `.env` no existe o está en la ubicación incorrecta

**Solución:**
```bash
# Verificar si existe
ls -la .env

# Si no existe, créalo desde el ejemplo
cp .env.example .env
```

### Error: "Las variables están configuradas pero vacías"

**Causa:** El archivo `.env` existe pero tiene valores de ejemplo

**Solución:**
1. Abre `.env`
2. Reemplaza `https://your-project-url.supabase.co` con tu URL real
3. Reemplaza `your-service-role-key-here` con tu clave real

### Error: "Invalid API key"

**Causa:** La clave es incorrecta o está mal copiada

**Solución:**
1. Vuelve a copiar la **service_role key** desde Supabase
2. Asegúrate de copiar la clave **completa** (es muy larga)
3. No dejes espacios al inicio o final
4. Guarda el archivo `.env`
5. Reinicia la aplicación

### La aplicación empaquetada no encuentra .env

**Causa:** El archivo `.env` no se incluyó en el build

**Solución:**
1. Verifica que `.env` exista en la raíz antes de hacer `npm run release`
2. Después de empaquetar, copia `.env` manualmente a:
   ```
   release/win-unpacked/resources/extraResources/.env
   ```
3. O colócalo en `%APPDATA%/A30%/.env`

### Debugging: Ver dónde busca la app

Cuando inicies la app, verás en la consola las rutas donde se buscó `.env`:

```
⚠️ No se encontró archivo .env en ninguna ubicación:
   - C:\Program Files\A30%\resources\.env
   - C:\Program Files\A30%\resources\extraResources\.env
   - C:\Users\Usuario\AppData\Roaming\A30%\.env
   - C:\Users\Usuario\Documents\GO\Mejora claude\SISTEMA-CONSTANCIAS30\.env
```

Coloca tu `.env` en **cualquiera** de esas ubicaciones.

---

## 📁 Estructura de Archivos

```
tu-proyecto/
├── .env                          ← TUS CREDENCIALES REALES (NO SUBIR A GIT)
├── .env.example                  ← PLANTILLA DE EJEMPLO
├── .gitignore                    ← DEBE INCLUIR .env
├── CONFIGURACION-SUPABASE.md     ← ESTA GUÍA
├── main.js                       ← CARGA DOTENV
├── package.json
└── src/
    └── config/
        └── supabase.js           ← USA LAS CREDENCIALES
```

---

## 🔐 Seguridad

### ⚠️ IMPORTANTE:

- **NUNCA** subas `.env` a Git (ya está en `.gitignore`)
- **NUNCA** compartas tu `service_role key` públicamente
- **NUNCA** pongas credenciales directamente en el código
- Usa `.env` para todas las credenciales sensibles

### Verificar que .env está en .gitignore:

```bash
git check-ignore .env
# Debería mostrar: .env
```

---

## ✅ Checklist Final

Antes de ejecutar la aplicación, verifica:

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] `SUPABASE_URL` tiene tu URL real (https://...)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tiene tu clave real (eyJ...)
- [ ] No hay espacios ni comillas en los valores
- [ ] El archivo está guardado
- [ ] `.env` está en `.gitignore`

---

## 📞 Soporte

Si sigues teniendo problemas:

1. Verifica los logs de la aplicación (DevTools → Console)
2. Ejecuta `node test-supabase-connection.js`
3. Revisa que tus credenciales sean correctas en Supabase
4. Asegúrate de estar usando la **service_role key**, no la anon key

---

**Última actualización:** 2025-01-14
**Versión:** 1.0.0

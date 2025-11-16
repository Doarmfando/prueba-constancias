# Sistema de Constancias A30 - Modos de Ejecución

Este sistema puede ejecutarse en **dos modos diferentes**:

1. **Modo Electron** (Aplicación de escritorio)
2. **Modo Web** (Aplicación web con servidor backend)

## 🖥️ Modo Electron (Aplicación de Escritorio)

### Características
- Aplicación nativa de escritorio
- No requiere servidor web externo
- Usa IPC (Inter-Process Communication) entre frontend y backend
- Almacenamiento local + Supabase Storage

### Cómo ejecutar

**Desarrollo:**
```bash
npm run dev
```

Este comando ejecuta:
- Frontend en `http://localhost:8083`
- Aplicación Electron

**Producción:**
```bash
npm run electron:prod
```

**Empaquetar para distribución:**
```bash
npm run dist
```

Esto generará un instalador en la carpeta `release/`.

---

## 🌐 Modo Web (Aplicación Web)

### Características
- Acceso desde cualquier navegador
- Acceso desde múltiples PCs sin instalación
- API REST backend con Express
- Todos los datos y archivos en Supabase (nube)
- **Ideal para trabajo colaborativo**

### Cómo ejecutar

**Desarrollo:**
```bash
npm run web
```

Este comando ejecuta simultáneamente:
- Frontend en `http://localhost:8083`
- Backend API en `http://localhost:3001`

**Solo backend:**
```bash
npm run server
```

**Solo frontend:**
```bash
npm start
```

### Acceder a la aplicación web

1. Abre tu navegador
2. Ve a `http://localhost:8083`
3. La aplicación detectará automáticamente que está en modo web

### Acceso desde otra PC en la red local

1. En la PC donde corre el servidor, obtén tu IP local:
   - Windows: `ipconfig` → busca "Dirección IPv4"
   - Linux/Mac: `ifconfig` o `ip addr`

2. En la otra PC, abre el navegador y ve a:
   ```
   http://[IP-DE-TU-PC]:8083
   ```

   Ejemplo: `http://192.168.1.100:8083`

3. Asegúrate de que el firewall permita conexiones en los puertos 8083 y 3001

---

## 🔧 Configuración

### Variables de entorno (.env)

Asegúrate de tener configurado tu archivo `.env`:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NODE_ENV=development
API_URL=http://localhost:3001/api  # Para modo web
```

### Cambiar puerto del servidor (opcional)

Si el puerto 3001 está ocupado, puedes cambiarlo:

```env
PORT=3002
```

Y actualizar `API_URL` en consecuencia.

---

## 📊 Diferencias entre modos

| Característica | Modo Electron | Modo Web |
|----------------|---------------|----------|
| Instalación | Requiere instalación en cada PC | Solo navegador |
| Acceso multiplataforma | Windows, Mac, Linux (con build) | Cualquier dispositivo con navegador |
| Archivos locales | Soporta almacenamiento local | Solo Supabase Storage |
| Acceso desde otras PCs | ❌ No (cada PC tiene su instalación) | ✅ Sí (acceso centralizado) |
| Actualización | Redistribuir instalador | Automática (refrescar navegador) |
| Offline | ✅ Funciona con archivos locales | ❌ Requiere conexión |
| Ideal para | Usuario individual, PC específica | Equipo distribuido, múltiples PCs |

---

## 🚀 Deploy en Producción (Modo Web)

### Frontend (Vercel, Netlify, etc.)

1. Build del frontend:
   ```bash
   npm run build
   ```

2. Deploy la carpeta `dist/` a tu servicio preferido

### Backend (Railway, Render, Heroku, etc.)

1. Sube el código a un repositorio Git
2. Configura las variables de entorno en el servicio
3. El servicio ejecutará automáticamente `node server.js`

### Configurar URL del backend

En producción, actualiza la variable de entorno:

```env
API_URL=https://tu-backend.railway.app/api
```

---

## 🔍 Detección Automática de Modo

El sistema detecta automáticamente en qué modo está ejecutándose:

- Si `window.electronAPI` existe → **Modo Electron**
- Si no existe → **Modo Web**

El archivo `src/api/apiAdapter.js` maneja esta detección y adapta las llamadas automáticamente.

---

## 🐛 Troubleshooting

### Modo Web

**Error: "Cannot GET /api/..."**
- Verifica que el servidor esté corriendo: `npm run server`
- Verifica el puerto en la consola del servidor

**Error: "Network error" o "Failed to fetch"**
- El backend no está corriendo o está en un puerto diferente
- Verifica `API_URL` en el código del frontend
- Verifica que no haya CORS issues

**Los archivos no se suben**
- Verifica que Supabase esté configurado correctamente
- Verifica las credenciales en `.env`
- Revisa los logs del servidor

### Modo Electron

**La aplicación no inicia**
- Verifica que todas las dependencias estén instaladas: `npm install`
- Verifica que no haya errores en la consola

**Los archivos no se guardan**
- Verifica permisos de escritura en la carpeta de la aplicación
- Verifica configuración de Supabase

---

## 📝 Notas Importantes

1. **Supabase Storage**: Ambos modos usan Supabase Storage para archivos en la nube
2. **Base de datos**: Ambos modos usan la misma base de datos de Supabase
3. **Autenticación**: Se mantiene la misma lógica de autenticación local
4. **Compatibilidad**: Los archivos subidos en modo Electron pueden descargarse en modo Web y viceversa

---

## 🎯 Recomendación

Para tu caso de uso (acceso desde múltiples PCs), **recomendamos el Modo Web** porque:

✅ No necesitas instalar nada en cada PC
✅ Todos acceden a los mismos datos en tiempo real
✅ Los archivos están centralizados en Supabase
✅ Las actualizaciones son instantáneas para todos
✅ Puedes acceder desde cualquier lugar con internet

El Modo Electron es útil si necesitas:
- Trabajar offline
- Acceso a archivos locales específicos
- Una aplicación nativa de escritorio

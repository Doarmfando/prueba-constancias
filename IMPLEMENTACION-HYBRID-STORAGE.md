# 📦 Sistema de Almacenamiento Híbrido - Implementación Completa

## ✅ Estado de Implementación

El sistema de almacenamiento híbrido ha sido **completamente implementado** y está listo para usar.

---

## 🎯 ¿Qué es?

Un sistema inteligente que combina:
- **Supabase Storage** (almacenamiento en la nube)
- **Almacenamiento local** (como fallback automático)

### Características Implementadas

✅ **Subida inteligente con fallback automático**
- Intenta subir a Supabase primero
- Si falla (sin internet, cuota excedida, archivo grande), guarda localmente
- Detecta el tipo específico de error

✅ **Sistema de notificaciones**
- Muestra al usuario dónde se guardó el archivo
- Indica el motivo si se guardó localmente
- Permite reintentar sincronización manualmente

✅ **Cola de sincronización**
- Archivos guardados localmente se agregan a una cola
- Se pueden sincronizar automáticamente cuando vuelva la conexión
- Límite de 3 intentos por archivo

✅ **Integración completa**
- DocumentoPersonaController usa el sistema híbrido
- IPC handlers registrados para frontend
- API expuesta en preload.js

---

## 📋 Pasos para Activar el Sistema

### **Paso 1: Ejecutar políticas RLS en Supabase**

Ve a Supabase → SQL Editor y ejecuta el archivo:
```
setup-storage-policies.sql
```

Esto creará las políticas de seguridad para el bucket "Archivos".

### **Paso 2: Agregar columnas a la base de datos**

Ejecuta el script de migración:
```
add-hybrid-storage-columns.sql
```

Esto agregará las columnas necesarias a la tabla `documentos_persona`:
- `url_archivo` - URL del archivo en Supabase Storage
- `ubicacion_almacenamiento` - 'SUPABASE' o 'LOCAL'

### **Paso 3: Verificar que el bucket existe**

En Supabase → Storage, verifica que existe el bucket:
- **Nombre**: `Archivos`
- **Tipo**: Privado (solo usuarios autenticados)

Si no existe, créalo desde el panel de Supabase.

---

## 💻 Cómo Funciona

### Flujo de Subida de Archivos

```
1. Usuario selecciona archivo
   ↓
2. HybridStorageService intenta subir a Supabase
   ↓
3a. ✅ ÉXITO → Guarda en Supabase Storage
   |   - Almacena URL pública
   |   - Marca ubicacion = 'SUPABASE'
   |   - Muestra mensaje de éxito
   |
3b. ❌ FALLO → Guarda localmente
       - Detecta tipo de error (cuota, conexión, etc.)
       - Guarda en disco local
       - Si es retryable, agrega a cola de sincronización
       - Muestra notificación al usuario
```

### Tipos de Errores Detectados

El sistema detecta automáticamente:

| Tipo | Descripción | Se reintenta |
|------|-------------|--------------|
| `CUOTA_EXCEDIDA` | Almacenamiento lleno en Supabase | ❌ No |
| `SIN_CONEXION` | Sin conexión a internet | ✅ Sí |
| `ARCHIVO_GRANDE` | Archivo excede el tamaño máximo | ❌ No |
| `AUTH_ERROR` | Error de autenticación | ❌ No |
| `PERMISOS` | Sin permisos para subir | ❌ No |

---

## 🔧 API del Frontend

El sistema está disponible en el frontend a través de `window.electronAPI.storage`:

### 1. Sincronizar archivos pendientes

```javascript
const resultado = await window.electronAPI.storage.sincronizar();

if (resultado.success) {
  console.log(`${resultado.sincronizados} archivos sincronizados`);
  console.log(`${resultado.fallidos} archivos fallidos`);
  console.log(`${resultado.pendientes} archivos pendientes`);
}
```

### 2. Obtener estadísticas de la cola

```javascript
const stats = await window.electronAPI.storage.obtenerEstadisticasCola();

console.log(`Total en cola: ${stats.total}`);
console.log(`Por tipo de error:`, stats.porTipoError);
```

### 3. Subir archivo directamente (opcional)

```javascript
const resultado = await window.electronAPI.storage.subirArchivo({
  archivoBuffer: buffer,
  dni: '12345678',
  nombreArchivo: 'documento.pdf',
  metadata: { contentType: 'application/pdf' }
});

if (resultado.ubicacion === 'SUPABASE') {
  console.log('Archivo en la nube:', resultado.url);
} else {
  console.log('Archivo guardado localmente:', resultado.ruta);
}
```

---

## 🎨 Componente de Notificaciones

El componente `NotificacionStorage.jsx` ya está creado y listo para usar.

### Uso en tu frontend:

```jsx
import NotificacionStorage from '../components/NotificacionStorage';

function MiComponente() {
  const [notificacion, setNotificacion] = useState(null);

  const subirDocumento = async () => {
    const resultado = await window.electronAPI.documentosPersona.subirDocumento({
      persona_id: 1,
      archivo_origen: rutaArchivo,
      nombre_archivo: 'documento.pdf'
    });

    // Si hay notificación, mostrarla
    if (resultado.notificacion) {
      setNotificacion(resultado.notificacion);
    }
  };

  return (
    <>
      {/* Tu contenido */}

      {/* Notificación de storage */}
      <NotificacionStorage
        mostrar={!!notificacion}
        onCerrar={() => setNotificacion(null)}
        datos={notificacion}
      />
    </>
  );
}
```

---

## 📊 Estructura de Archivos

### Archivos Creados/Modificados

```
src/
├── main/
│   ├── services/
│   │   ├── StorageService.js            ← Nuevo (Supabase Storage)
│   │   └── HybridStorageService.js      ← Nuevo (Lógica híbrida)
│   ├── controllers/
│   │   └── DocumentoPersonaController.js ← Modificado (usa HybridStorage)
│   ├── models/
│   │   └── DocumentoPersonaModel.js     ← Modificado (nuevas columnas)
│   └── ipc/
│       ├── StorageIPCHandler.js         ← Nuevo (handlers IPC)
│       └── IPCManager.js                ← Modificado (registra storage)
├── components/
│   └── NotificacionStorage.jsx          ← Nuevo (UI de notificaciones)
├── main.js                               ← Modificado (inicializa HybridStorage)
└── preload.js                            ← Modificado (expone API storage)

Raíz:
├── setup-storage-policies.sql            ← Nuevo (políticas RLS)
├── add-hybrid-storage-columns.sql        ← Nuevo (migración BD)
├── GUIA-STORAGE.md                       ← Existente (guía original)
└── IMPLEMENTACION-HYBRID-STORAGE.md      ← Nuevo (este archivo)
```

---

## 🧪 Prueba Rápida

### 1. Verificar que el sistema esté activo

Abre DevTools en tu aplicación Electron y ejecuta:

```javascript
// Verificar que la API está disponible
console.log(window.electronAPI.storage);

// Debería mostrar:
// {
//   sincronizar: ƒ,
//   obtenerEstadisticasCola: ƒ,
//   subirArchivo: ƒ,
//   descargarArchivo: ƒ,
//   eliminarArchivo: ƒ,
//   listarArchivos: ƒ
// }
```

### 2. Subir un archivo de prueba

Usa la funcionalidad existente de DocumentoPersona para subir un archivo.

El sistema automáticamente:
- Intentará subirlo a Supabase
- Si falla, lo guardará localmente
- Mostrará una notificación si corresponde

### 3. Verificar la cola de sincronización

```javascript
const stats = await window.electronAPI.storage.obtenerEstadisticasCola();
console.log('Archivos en cola:', stats);
```

### 4. Intentar sincronizar

```javascript
const resultado = await window.electronAPI.storage.sincronizar();
console.log('Resultado de sincronización:', resultado);
```

---

## ⚙️ Configuración Avanzada

### Cambiar el bucket de almacenamiento

En `src/main/services/StorageService.js`, línea 7:

```javascript
this.bucketName = 'Archivos'; // Cambiar por el nombre de tu bucket
```

### Cambiar el número de reintentos

En `src/main/services/HybridStorageService.js`, línea 348:

```javascript
if (item.intentos < 3) { // Cambiar 3 por el número deseado
  colaActualizada.push(item);
}
```

### Cambiar la ruta de almacenamiento local

En `src/main/services/HybridStorageService.js`, línea 19:

```javascript
this.documentosBasePath = path.join(app.getPath('userData'), 'documentos', 'personas');
```

---

## 🔗 Recursos Adicionales

- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [API Reference de Supabase Storage](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Guía original de Storage](./GUIA-STORAGE.md)

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si se llena el almacenamiento de Supabase?

El sistema detecta automáticamente el error `CUOTA_EXCEDIDA` y:
- Guarda el archivo localmente
- NO lo agrega a la cola de reintento (no tiene sentido reintentar)
- Muestra una notificación naranja al usuario

### ¿Los archivos locales se sincronizan automáticamente?

No, la sincronización es **manual**. El usuario debe hacer clic en "Intentar ahora" en la notificación o llamar explícitamente a la función de sincronización.

Esto es intencional para no consumir ancho de banda sin permiso del usuario.

### ¿Puedo migrar archivos locales existentes a Supabase?

Sí, puedes crear un script de migración que:
1. Lea todos los documentos con `ubicacion_almacenamiento = 'LOCAL'`
2. Para cada uno, use `HybridStorageService.subirArchivoConFallback()`
3. Actualice la base de datos con la nueva ubicación

### ¿Qué pasa si elimino un archivo de la base de datos pero está en Supabase?

El sistema actual solo elimina de Supabase si el archivo fue detectado como almacenado allí. Considera implementar una limpieza periódica de archivos huérfanos.

---

## ✅ Checklist de Implementación

- [x] StorageService.js creado
- [x] HybridStorageService.js creado
- [x] NotificacionStorage.jsx creado
- [x] StorageIPCHandler.js creado
- [x] IPCManager actualizado
- [x] DocumentoPersonaController integrado
- [x] DocumentoPersonaModel actualizado
- [x] preload.js actualizado con API
- [x] main.js inicializa HybridStorage
- [x] Políticas RLS creadas (setup-storage-policies.sql)
- [x] Migración de BD creada (add-hybrid-storage-columns.sql)
- [ ] Políticas RLS ejecutadas en Supabase (pendiente del usuario)
- [ ] Migración de BD ejecutada (pendiente del usuario)
- [ ] Bucket "Archivos" creado en Supabase (ya existe según usuario)

---

## 🚀 Próximos Pasos Sugeridos

1. **Ejecutar las migraciones SQL** mencionadas arriba
2. **Probar el sistema** subiendo archivos
3. **Simular errores** (desconectar internet) para ver el fallback
4. **Implementar UI de sincronización** en alguna página de administración
5. **Agregar indicador visual** de archivos en cola de sincronización

---

**Fecha de implementación**: 2025-01-15
**Versión**: 1.0.0
**Estado**: ✅ Completado y listo para usar

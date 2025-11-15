# 📦 Guía de Uso - Supabase Storage

## 🎯 ¿Qué es?

El `StorageService` es un servicio que te permite subir, descargar y gestionar archivos en Supabase Storage (la nube).

---

## 📋 Pasos de Configuración

### **1. Ejecutar políticas RLS** ✅ (Ya lo hiciste)

Ve a Supabase → SQL Editor y ejecuta el archivo `setup-storage-policies.sql`

### **2. Verificar que el bucket existe** ✅ (Ya lo creaste)

- Nombre del bucket: `Archivos`
- Tipo: Privado (solo usuarios autenticados pueden acceder)

---

## 💻 Cómo Usar el StorageService

### **Importar el servicio**

```javascript
const StorageService = require('./services/StorageService');

// Crear instancia (necesitas el cliente de Supabase)
const storageService = new StorageService(supabaseClient);
```

### **1. Subir un archivo**

```javascript
// Leer archivo desde el disco
const fs = require('fs');
const archivo = fs.readFileSync('/ruta/al/archivo.pdf');

// Subir a Supabase Storage
const resultado = await storageService.subirArchivo(
  archivo,                                    // Buffer del archivo
  'personas/12345678/documento.pdf',         // Ruta donde se guardará
  {
    contentType: 'application/pdf',          // Tipo MIME
    upsert: false                            // false = error si existe, true = sobrescribir
  }
);

if (resultado.success) {
  console.log('URL del archivo:', resultado.url);
  console.log('Ruta en Storage:', resultado.path);
} else {
  console.error('Error:', resultado.error);
}
```

### **2. Descargar un archivo**

```javascript
const resultado = await storageService.descargarArchivo(
  'personas/12345678/documento.pdf'
);

if (resultado.success) {
  // resultado.data es un Blob
  // Puedes guardarlo en disco:
  const buffer = Buffer.from(await resultado.data.arrayBuffer());
  fs.writeFileSync('/destino/documento.pdf', buffer);
}
```

### **3. Eliminar un archivo**

```javascript
const resultado = await storageService.eliminarArchivo(
  'personas/12345678/documento.pdf'
);

if (resultado.success) {
  console.log('Archivo eliminado');
}
```

### **4. Listar archivos de una persona**

```javascript
const resultado = await storageService.listarArchivos(
  'personas/12345678',  // Carpeta
  {
    limit: 50,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  }
);

if (resultado.success) {
  resultado.files.forEach(file => {
    console.log(file.name, file.created_at, file.metadata.size);
  });
}
```

### **5. Obtener URL pública de un archivo**

```javascript
const url = storageService.obtenerUrlPublica('personas/12345678/documento.pdf');
console.log('URL:', url);
```

### **6. Generar ruta única automáticamente**

```javascript
const ruta = storageService.generarRutaUnica('12345678', 'mi-documento.pdf');
// Resultado: "personas/12345678/mi-documento_1699999999999.pdf"
```

---

## 🔧 Integración con DocumentoPersonaController

### **Ejemplo: Modificar el método `subirDocumento`**

```javascript
// En DocumentoPersonaController.js

async subirDocumento(datos) {
  try {
    const { persona_id, archivo_buffer, nombre_archivo, comentario, usuario_carga_id } = datos;

    // 1. Obtener persona
    const persona = await this.personaModel.buscarPorId(persona_id);
    if (!persona || !persona.dni) {
      throw new Error('Persona no encontrada o sin DNI');
    }

    // 2. Generar ruta única en Storage
    const rutaStorage = this.storageService.generarRutaUnica(persona.dni, nombre_archivo);

    // 3. Subir a Supabase Storage
    const resultadoUpload = await this.storageService.subirArchivo(
      archivo_buffer,
      rutaStorage,
      {
        contentType: this.obtenerContentType(nombre_archivo),
        upsert: false
      }
    );

    if (!resultadoUpload.success) {
      throw new Error(resultadoUpload.error);
    }

    // 4. Guardar metadata en la base de datos
    const resultado = await this.model.crear({
      persona_id,
      nombre_archivo,
      ruta_archivo: rutaStorage,           // Guardar ruta de Storage
      url_archivo: resultadoUpload.url,    // Guardar URL
      tipo_archivo: this.model.obtenerTipoArchivo(nombre_archivo),
      comentario: comentario || '',
      usuario_carga_id,
      tamaño_bytes: archivo_buffer.length
    });

    return {
      success: true,
      documento: await this.model.obtenerPorId(resultado.id),
      url: resultadoUpload.url
    };

  } catch (error) {
    this.handleError(error, 'Error subiendo documento');
  }
}

// Método auxiliar para obtener Content-Type
obtenerContentType(nombreArchivo) {
  const extension = nombreArchivo.split('.').pop().toLowerCase();
  const tipos = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip'
  };
  return tipos[extension] || 'application/octet-stream';
}
```

---

## 📊 Estructura de Carpetas Recomendada

```
Archivos/ (bucket)
├── personas/
│   ├── 12345678/
│   │   ├── documento1_1699999999999.pdf
│   │   ├── foto_1699999999998.jpg
│   │   └── constancia_1699999999997.pdf
│   ├── 87654321/
│   │   └── documento_1699999999996.pdf
│   └── ...
└── temp/
    └── archivos temporales
```

---

## ⚠️ Consideraciones Importantes

1. **Tamaño máximo**: Supabase tiene límites por archivo (50MB en el plan gratuito)
2. **URLs públicas**: Si el bucket es público, cualquiera con la URL puede acceder
3. **URLs firmadas**: Para buckets privados, usa `obtenerUrlFirmada()` para acceso temporal
4. **Nombres de archivo**: Usa `generarRutaUnica()` para evitar conflictos
5. **Limpieza**: Elimina archivos huérfanos (archivos sin registro en la BD)

---

## 🧪 Prueba Rápida

```javascript
// Prueba simple para verificar que funciona
async function probarStorage() {
  const fs = require('fs');
  const StorageService = require('./services/StorageService');

  const storage = new StorageService(supabaseClient);

  // Crear archivo de prueba
  const contenido = Buffer.from('Hola desde Supabase Storage!');

  // Subir
  const resultado = await storage.subirArchivo(
    contenido,
    'prueba/test.txt',
    { contentType: 'text/plain' }
  );

  console.log('✅ Resultado:', resultado);
}
```

---

## 🔗 Recursos

- [Documentación oficial de Supabase Storage](https://supabase.com/docs/guides/storage)
- [API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Límites y precios](https://supabase.com/pricing)

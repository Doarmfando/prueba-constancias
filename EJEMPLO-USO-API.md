# Cómo usar el API Adapter en tus componentes

## Migración de `window.electronAPI` a `apiAdapter`

### Antes (solo Electron):
```javascript
// En cualquier componente
const resultado = await window.electronAPI.personas.listar();
```

### Después (Electron + Web):
```javascript
// Importar el adapter
import apiAdapter from '../api/apiAdapter';

// En cualquier componente
const resultado = await apiAdapter.personas.listar();
```

El adapter detectará automáticamente si está en modo Electron o Web y usará el método apropiado.

---

## Ejemplos de Migración

### 1. Listar Personas

**Antes:**
```javascript
const cargarPersonas = async () => {
  const resultado = await window.electronAPI.personas.listar();
  if (resultado.success) {
    setPersonas(resultado.personas);
  }
};
```

**Después:**
```javascript
import apiAdapter from '../api/apiAdapter';

const cargarPersonas = async () => {
  const resultado = await apiAdapter.personas.listar();
  if (resultado.success) {
    setPersonas(resultado.personas);
  }
};
```

---

### 2. Subir Documento

**Antes (Electron):**
```javascript
const handleSubirDocumento = async () => {
  const resultado = await window.electronAPI.documentosPersona.subirDocumento({
    persona_id: personaId,
    archivo_origen: archivoPath,
    nombre_archivo: archivoNombre,
    comentario: comentario
  });
};
```

**Después (Electron + Web):**
```javascript
import apiAdapter from '../api/apiAdapter';

const handleSubirDocumento = async (event) => {
  // En modo web, necesitamos el archivo del input file
  const file = event.target.files[0];

  // Para Electron, usaríamos la ruta
  // Para Web, usamos el File object directamente

  const resultado = await apiAdapter.documentosPersona.subirDocumento({
    persona_id: personaId,
    archivo: file, // En modo web, esto es el File object
    nombre_archivo: file.name,
    comentario: comentario
  });
};
```

**Componente completo para subir archivos:**
```javascript
import React, { useState } from 'react';
import apiAdapter from '../api/apiAdapter';

const SubirDocumento = ({ personaId }) => {
  const [file, setFile] = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubir = async () => {
    if (!file) {
      alert('Selecciona un archivo');
      return;
    }

    setLoading(true);
    try {
      const mode = apiAdapter.getMode();

      let resultado;
      if (mode === 'electron') {
        // En Electron, necesitamos la ruta del archivo
        resultado = await apiAdapter.documentosPersona.subirDocumento({
          persona_id: personaId,
          archivo_origen: file.path, // En Electron, el file tiene .path
          nombre_archivo: file.name,
          comentario: comentario
        });
      } else {
        // En Web, usamos el File object directamente
        resultado = await apiAdapter.documentosPersona.subirDocumento({
          persona_id: personaId,
          archivo: file, // File object del input
          nombre_archivo: file.name,
          comentario: comentario
        });
      }

      if (resultado.success) {
        alert('Documento subido correctamente');
        setFile(null);
        setComentario('');
      }
    } catch (error) {
      console.error('Error subiendo documento:', error);
      alert('Error subiendo documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <input
        type="text"
        placeholder="Comentario"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
      />
      <button onClick={handleSubir} disabled={loading}>
        {loading ? 'Subiendo...' : 'Subir Documento'}
      </button>
    </div>
  );
};

export default SubirDocumento;
```

---

### 3. Descargar/Abrir Documento

**Antes:**
```javascript
const handleAbrirDocumento = async (documentoId) => {
  await window.electronAPI.documentosPersona.abrirDocumento(documentoId);
};
```

**Después:**
```javascript
import apiAdapter from '../api/apiAdapter';

const handleAbrirDocumento = async (documentoId) => {
  await apiAdapter.documentosPersona.abrirDocumento(documentoId);
  // En modo Electron: abre con la app predeterminada
  // En modo Web: abre en nueva pestaña del navegador
};

const handleDescargarDocumento = async (documentoId) => {
  await apiAdapter.documentosPersona.descargarDocumento(documentoId);
  // En modo Electron: muestra diálogo para guardar
  // En modo Web: descarga directamente
};
```

---

### 4. Login de Usuario

**Antes:**
```javascript
const handleLogin = async () => {
  const resultado = await window.electronAPI.usuarios.login({
    usuario: username,
    contraseña: password
  });

  if (resultado.success) {
    localStorage.setItem('sesion_usuario', JSON.stringify(resultado.usuario));
  }
};
```

**Después:**
```javascript
import apiAdapter from '../api/apiAdapter';

const handleLogin = async () => {
  const resultado = await apiAdapter.usuarios.login({
    usuario: username,
    contraseña: password
  });

  if (resultado.success) {
    localStorage.setItem('sesion_usuario', JSON.stringify(resultado.usuario));
  }
};
```

---

### 5. Crear Constancia

**Antes:**
```javascript
const handleCrearConstancia = async () => {
  const resultado = await window.electronAPI.constancias.crear({
    persona_id: personaId,
    tipo_constancia_id: tipoId,
    fecha_pago: fechaPago,
    monto: monto
  });
};
```

**Después:**
```javascript
import apiAdapter from '../api/apiAdapter';

const handleCrearConstancia = async () => {
  const resultado = await apiAdapter.constancias.crear({
    persona_id: personaId,
    tipo_constancia_id: tipoId,
    fecha_pago: fechaPago,
    monto: monto
  });
};
```

---

## Verificar en qué modo está la aplicación

```javascript
import apiAdapter from '../api/apiAdapter';

const mode = apiAdapter.getMode(); // 'electron' o 'web'

if (mode === 'electron') {
  console.log('Estamos en modo Electron');
} else {
  console.log('Estamos en modo Web');
}
```

---

## Mostrar indicador de modo al usuario

```javascript
import React, { useEffect, useState } from 'react';
import apiAdapter from '../api/apiAdapter';

const ModeIndicator = () => {
  const [mode, setMode] = useState('');

  useEffect(() => {
    setMode(apiAdapter.getMode());
  }, []);

  return (
    <div style={{ padding: '10px', background: mode === 'electron' ? '#e3f2fd' : '#fff3e0' }}>
      Modo: {mode === 'electron' ? '🖥️ Escritorio' : '🌐 Web'}
    </div>
  );
};

export default ModeIndicator;
```

---

## Componentes que necesitan migración

Busca en tu código todos los archivos que usan `window.electronAPI` y reemplázalos con `apiAdapter`:

```bash
# Buscar todos los usos de window.electronAPI
grep -r "window.electronAPI" src/
```

Principales componentes a actualizar:
- `src/pages/PersonaDetalle.jsx` - Gestión de documentos
- `src/pages/Personas.jsx` - Lista de personas
- `src/pages/Constancias.jsx` - Gestión de constancias
- `src/pages/Login.jsx` - Autenticación
- `src/context/AuthContext.js` - Contexto de autenticación
- Cualquier componente que use IPC de Electron

---

## Manejo de errores

```javascript
import apiAdapter from '../api/apiAdapter';

const cargarDatos = async () => {
  try {
    const resultado = await apiAdapter.personas.listar();

    if (resultado.success) {
      setPersonas(resultado.personas);
    } else {
      console.error('Error:', resultado.error);
      alert(`Error: ${resultado.error}`);
    }
  } catch (error) {
    console.error('Error en la petición:', error);
    alert('Error de conexión. Verifica que el servidor esté corriendo.');
  }
};
```

---

## Tips importantes

1. **Import siempre el adapter**: Nunca uses directamente `window.electronAPI`

2. **Manejo de archivos**: En modo web, usa `<input type="file">` y trabaja con File objects

3. **Rutas de archivos**: En modo Electron puedes tener rutas locales, en Web todo debe estar en Supabase

4. **Testing**: Prueba siempre en ambos modos (Electron y Web)

5. **Errores de red**: En modo Web, maneja posibles errores de conexión al backend

6. **CORS**: Si el backend y frontend están en dominios diferentes, configura CORS correctamente

---

## Migración paso a paso

1. **Instala multer** (ya hecho): `npm install multer`

2. **Crea el servidor**: `server.js` (ya hecho)

3. **Crea el adapter**: `src/api/apiAdapter.js` (ya hecho)

4. **Actualiza package.json**: Scripts para modo web (ya hecho)

5. **Migra tus componentes**: Reemplaza `window.electronAPI` con `apiAdapter`

6. **Prueba en modo Electron**: `npm run dev`

7. **Prueba en modo Web**: `npm run web`

8. **Deploy**: Sube frontend y backend a la nube

---

## Próximos pasos recomendados

1. Migrar un componente de ejemplo (ej: `Personas.jsx`)
2. Probar que funcione en ambos modos
3. Migrar el resto de componentes uno por uno
4. Hacer pruebas exhaustivas
5. Deploy a producción

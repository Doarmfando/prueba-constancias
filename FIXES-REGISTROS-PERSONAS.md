# Correcciones: Sistema de Registros y Personas

## 🐛 **PROBLEMAS ENCONTRADOS Y SOLUCIONADOS**

### **Error Principal:**
```
this.registroModel.buscarPorDni is not a function
```

### **Causa Raíz:**
Al migrar de SQLite a Supabase, varios métodos no fueron implementados en los modelos, causando que el sistema de búsqueda por DNI y gestión de registros fallara.

---

## 🔧 **CAMBIOS REALIZADOS**

### **1. RegistroModel.js**

#### **Método agregado: `buscarPorDni(dni)`**

**Ubicación:** `src/main/models/RegistroModel.js:218-256`

**Funcionalidad:**
- Busca todos los registros de una persona por DNI
- Hace JOIN con personas, expedientes, estados y proyectos
- Retorna datos formateados para el frontend

**Código:**
```javascript
async buscarPorDni(dni) {
  const { data, error } = await this.db
    .from(this.tableName)
    .select(`
      *,
      personas (id, nombre, dni, numero),
      expedientes (id, codigo, fecha_solicitud, fecha_entrega, observacion),
      estados (nombre),
      proyectos_registros (nombre)
    `)
    .eq('eliminado', false)
    .order('fecha_registro', { ascending: false });

  if (error) throw error;

  // Filtrar por DNI
  const registrosFiltrados = (data || []).filter(r => r.personas?.dni === dni);

  return registrosFiltrados.map(r => ({
    registro_id: r.id,
    persona_id: r.personas?.id,
    expediente_id: r.expedientes?.id,
    nombre: r.personas?.nombre,
    dni: r.personas?.dni,
    numero: r.personas?.numero,
    codigo: r.expedientes?.codigo,
    expediente: r.expedientes?.codigo,
    fecha_solicitud: r.expedientes?.fecha_solicitud,
    fecha_entrega: r.expedientes?.fecha_entrega,
    observacion: r.expedientes?.observacion,
    estado_nombre: r.estados?.nombre,
    estado: r.estados?.nombre,
    fecha_registro: r.fecha_registro,
    fecha_en_caja: r.fecha_en_caja || 'No entregado',
    proyecto_nombre: r.proyectos_registros?.nombre,
    estado_id: r.estado_id
  }));
}
```

---

### **2. InformacionController.js**

#### **Problema:** Usaba métodos de SQL directo incompatibles con Supabase

**Cambios realizados:**

#### **a) Método `actualizarInformacion`** (línea 27)

**Antes:**
```javascript
const registro = await this.registroModel.executeGet(
  "SELECT persona_id FROM registros WHERE id = ?",
  [registro_id]
);
```

**Ahora:**
```javascript
const registro = await this.registroModel.obtenerPorId(registro_id);
```

---

#### **b) Método `validarConsistenciaDatos`** (línea 163)

**Antes:**
```javascript
const query = `
  SELECT r.id, r.estado_id, ...
  FROM registros r
  JOIN personas p ON ...
  WHERE r.id = ?
`;
const registro = await this.registroModel.executeGet(query, [registro_id]);
```

**Ahora:**
```javascript
const registro = await this.registroModel.obtenerPorId(registro_id);
```

**Actualización de campos:** Cambiados para coincidir con los nombres retornados por `obtenerPorId`:
- `registro.dni` → `registro.persona_dni`
- `registro.nombre` → `registro.persona_nombre`
- `registro.fecha_entrega` → `registro.expediente_fecha_entrega`
- `registro.fecha_solicitud` → `registro.expediente_fecha_solicitud`

---

#### **c) Método `buscarPersonasSimilares`** (línea 344)

**Antes:**
```javascript
const porDni = await this.personaModel.executeQuery(
  "SELECT * FROM personas WHERE dni LIKE ? AND dni != ?",
  [dniPattern, dni]
);
```

**Ahora:**
```javascript
const { data: porDni, error: errorDni } = await this.personaModel.db
  .from('personas')
  .select('*')
  .ilike('dni', `${dniPattern}%`)
  .neq('dni', dni);
```

---

## ✅ **FUNCIONALIDADES REPARADAS**

### **1. Búsqueda de Persona por DNI**
- ✅ Busca persona en tabla `personas`
- ✅ Obtiene todos sus registros
- ✅ Retorna datos formateados para el frontend
- ✅ Maneja caso de persona sin registros

**IPC Handler:** `buscar-persona-por-dni`

**Flujo:**
```
Frontend → IPC → InformacionController.buscarPersonaPorDni()
         → RegistroModel.buscarPorDni(dni)
         → Retorna { persona, registros }
```

---

### **2. Agregar Registro**
- ✅ Crea persona si no existe
- ✅ Crea expediente
- ✅ Vincula registro con persona y expediente
- ✅ Asocia a proyecto actual

**IPC Handler:** `agregar-registro`

---

### **3. Actualizar Información**
- ✅ Actualiza número de teléfono de persona
- ✅ Actualiza observaciones de expediente
- ✅ Actualiza fechas (solicitud, entrega)

**IPC Handler:** `actualizar-informacion`

---

### **4. Validar Consistencia de Datos**
- ✅ Valida formato de DNI (8 dígitos)
- ✅ Valida coherencia de fechas
- ✅ Valida estado vs fechas (Ej: "Entregado" debe tener fecha_entrega)
- ✅ Valida datos obligatorios (nombre no vacío)

**IPC Handler:** `validar-consistencia-datos`

---

### **5. Buscar Personas Similares**
- ✅ Busca por DNI similar (primeros 6 dígitos)
- ✅ Busca por nombre similar (LIKE)
- ✅ Elimina duplicados
- ✅ Útil para detectar registros duplicados

**IPC Handler:** `buscar-personas-similares`

---

## 📊 **ESTRUCTURA DE DATOS**

### **Registro Completo (retornado por `buscarPorDni`):**

```javascript
{
  registro_id: 123,
  persona_id: 45,
  expediente_id: 67,
  nombre: "Juan Pérez García",
  dni: "12345678",
  numero: "987654321",
  codigo: "EXP-2025-001",
  expediente: "EXP-2025-001",
  fecha_solicitud: "2025-01-15",
  fecha_entrega: "2025-01-20",
  observacion: "Constancia de pago",
  estado_nombre: "Entregado",
  estado: "Entregado",
  fecha_registro: "2025-01-15T10:30:00",
  fecha_en_caja: "2025-01-18",
  proyecto_nombre: "Proyecto 2025",
  estado_id: 3
}
```

---

## 🧪 **PRUEBAS**

### **Probar búsqueda por DNI:**

1. Abrir la aplicación
2. Ingresar DNI en el campo de búsqueda
3. Debe mostrar:
   - Datos de la persona (nombre, DNI, número)
   - Lista de registros asociados
   - Estados de cada registro

### **Probar agregar registro:**

1. Buscar persona por DNI (o crear nueva)
2. Llenar datos del expediente
3. Seleccionar estado
4. Guardar
5. Verificar que aparece en la lista de registros

---

## 🔍 **DEBUGGING**

Si sigues teniendo problemas, verifica:

### **1. Consola del navegador:**
```javascript
// Ver respuesta de búsqueda
console.log('Respuesta búsqueda:', response);
```

### **2. Logs de Electron:**
```
IPC: buscar-persona-por-dni - Iniciando
IPC: buscar-persona-por-dni - Completado exitosamente
```

### **3. Verificar datos en Supabase:**
```sql
-- Ver personas
SELECT * FROM personas WHERE dni = '12345678';

-- Ver registros de una persona
SELECT r.*, p.nombre, p.dni
FROM registros r
JOIN personas p ON r.persona_id = p.id
WHERE p.dni = '12345678';
```

---

## 📝 **ARCHIVOS MODIFICADOS**

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `src/main/models/RegistroModel.js` | Agregado `buscarPorDni()` | 218-256 |
| `src/main/controllers/InformacionController.js` | Refactorizado SQL a Supabase | 27, 163, 344 |
| `src/main/controllers/InformacionController.js` | Actualizado nombres de campos | 185-191 |

---

## ✨ **RESULTADO ESPERADO**

**Antes:**
```
❌ Error: this.registroModel.buscarPorDni is not a function
❌ No se puede buscar persona por DNI
❌ No se pueden crear registros
```

**Ahora:**
```
✅ Búsqueda por DNI funciona correctamente
✅ Se pueden crear registros
✅ Se pueden actualizar datos
✅ Se valida consistencia de datos
✅ Se pueden buscar personas similares
```

---

## 🚀 **PRÓXIMOS PASOS**

Si todo funciona correctamente, puedes:

1. Probar crear varios registros para diferentes personas
2. Probar búsqueda por DNI con personas existentes
3. Probar actualización de información
4. Verificar que los estados se actualizan correctamente

---

**Fecha de corrección:** 2025-11-15
**Versión:** 1.0

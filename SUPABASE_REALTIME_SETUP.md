# 🔄 Configuración de Supabase Realtime

Esta guía te ayudará a activar y configurar Supabase Realtime para que tu aplicación web se actualice automáticamente cuando haya cambios en la base de datos.

## 📋 Índice

1. [¿Qué es Supabase Realtime?](#qué-es-supabase-realtime)
2. [Activar Realtime en Supabase](#activar-realtime-en-supabase)
3. [Configuración de Tablas](#configuración-de-tablas)
4. [Verificar Funcionamiento](#verificar-funcionamiento)
5. [Solución de Problemas](#solución-de-problemas)

---

## ¿Qué es Supabase Realtime?

Supabase Realtime permite que tu aplicación reciba actualizaciones en tiempo real cuando ocurren cambios en la base de datos (INSERT, UPDATE, DELETE), sin necesidad de recargar la página o hacer polling.

### ✨ Beneficios

- **Actualizaciones instantáneas**: Los cambios se reflejan inmediatamente en todos los usuarios conectados
- **Sincronización automática**: No necesitas código adicional para refrescar los datos
- **Eficiencia**: Menor consumo de recursos que hacer polling constante
- **Mejor UX**: Los usuarios ven los cambios en tiempo real sin intervención manual

---

## 🚀 Activar Realtime en Supabase

### Paso 1: Acceder al Dashboard de Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Activar Realtime en las Tablas

Para cada tabla que quieras sincronizar en tiempo real:

1. **Ve a la sección "Database"** en el menú lateral
2. **Selecciona "Replication"** o "Publications"
3. **Activa la publicación "supabase_realtime"**

#### Opción A: Desde la interfaz web

1. Ve a **Database → Replication**
2. Busca la publicación `supabase_realtime`
3. Agrega las siguientes tablas:
   - ✅ `personas`
   - ✅ `usuarios`
   - ✅ `expedientes`
   - ✅ `registros`
   - ✅ `documentos_persona`
   - ✅ `auditoria`
   - ✅ `proyectos_registro`

#### Opción B: Usando SQL (Recomendado)

Ve a **SQL Editor** y ejecuta el siguiente script:

```sql
-- ==========================================
-- CONFIGURACIÓN DE SUPABASE REALTIME
-- ==========================================

-- 1. Habilitar Realtime para las tablas principales
ALTER PUBLICATION supabase_realtime ADD TABLE personas;
ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
ALTER PUBLICATION supabase_realtime ADD TABLE registros;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos_persona;
ALTER PUBLICATION supabase_realtime ADD TABLE auditoria;
ALTER PUBLICATION supabase_realtime ADD TABLE proyectos_registro;

-- 2. Verificar que las tablas están en la publicación
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 3. Configurar RLS (Row Level Security) si es necesario
-- IMPORTANTE: Asegúrate de tener políticas RLS configuradas correctamente
-- para que los usuarios solo vean los datos que les corresponden

-- Ejemplo de política RLS para proyectos públicos:
CREATE POLICY "Los usuarios pueden ver proyectos públicos"
ON proyectos FOR SELECT
USING (es_publico = true OR usuario_creador_id = auth.uid());

-- 4. Habilitar Realtime para inserciones, actualizaciones y eliminaciones
-- (Esto ya está habilitado por defecto, pero lo dejamos aquí como referencia)
```

### Paso 3: Configurar Políticas de Seguridad (RLS)

**⚠️ IMPORTANTE**: Supabase Realtime respeta las políticas RLS (Row Level Security). Asegúrate de configurarlas correctamente:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos_registro ENABLE ROW LEVEL SECURITY;

-- Ejemplo: Política para que todos los usuarios autenticados puedan ver personas
CREATE POLICY "Usuarios autenticados pueden ver personas"
ON personas FOR SELECT
TO authenticated
USING (true);

-- Ejemplo: Política para proyectos públicos
CREATE POLICY "Todos pueden ver proyectos públicos"
ON proyectos FOR SELECT
USING (es_publico = true);
```

---

## 📊 Configuración de Tablas

### Tablas Habilitadas para Realtime

| Tabla | Eventos | Descripción |
|-------|---------|-------------|
| `personas` | INSERT, UPDATE, DELETE | Sincroniza cambios en personas |
| `usuarios` | INSERT, UPDATE, DELETE | Sincroniza cambios de usuarios |
| `expedientes` | INSERT, UPDATE, DELETE | Sincroniza expedientes |
| `registros` | INSERT, UPDATE, DELETE | Sincroniza registros |
| `documentos_persona` | INSERT, UPDATE, DELETE | Sincroniza documentos adjuntos |
| `auditoria` | INSERT | Sincroniza nuevas entradas de auditoría |
| `proyectos_registro` | INSERT, UPDATE, DELETE | Sincroniza relaciones proyecto-registro |

### Eventos Soportados

- **INSERT**: Se dispara cuando se inserta un nuevo registro
- **UPDATE**: Se dispara cuando se actualiza un registro existente
- **DELETE**: Se dispara cuando se elimina un registro

---

## ✅ Verificar Funcionamiento

### Prueba en la Consola del Navegador

1. Abre tu aplicación web en el navegador
2. Abre la consola de desarrollador (F12)
3. Navega a la página de "Personas" o "Proyectos Públicos"
4. Deberías ver mensajes como:
   ```
   ✅ Suscrito a cambios en tiempo real de personas
   ```

### Prueba de Cambios en Tiempo Real

1. **Abre dos pestañas del navegador** con la aplicación web
2. En la primera pestaña, ve a "Personas"
3. En la segunda pestaña, agrega o edita una persona
4. **La primera pestaña se actualizará automáticamente** sin recargar

### Indicadores Visuales

Cuando Realtime está activo, verás:

- 🟢 **Badge "En vivo"** (círculo verde pulsante) en el encabezado
- 🔄 **Ícono de sincronización** girando cuando se actualizan datos
- 📢 **Notificaciones toast** cuando hay cambios:
  - ✨ "Nueva persona agregada"
  - 🔄 "Persona actualizada"
  - 🗑️ "Persona eliminada"

---

## 🔧 Configuración Avanzada

### Personalizar Eventos

Puedes configurar qué eventos escuchar en cada componente:

```javascript
// Solo escuchar inserciones
const { conectado } = useRealtimeData(
  'personas',
  handleChange,
  {
    filtros: { event: 'INSERT' }
  }
);

// Escuchar solo actualizaciones
const { conectado } = useRealtimeData(
  'proyectos',
  handleChange,
  {
    filtros: { event: 'UPDATE' }
  }
);
```

### Filtrar por Columnas

```javascript
// Solo escuchar cambios en proyectos públicos
const { conectado } = useRealtimeData(
  'proyectos',
  handleChange,
  {
    filtros: {
      filter: 'es_publico=eq.true'
    }
  }
);
```

### Ajustar Debounce

Para evitar múltiples recargas en rápida sucesión:

```javascript
const { conectado } = useRealtimeSync(
  'personas',
  cargarPersonas,
  {
    debounceMs: 1000 // Esperar 1 segundo antes de recargar
  }
);
```

---

## 🐛 Solución de Problemas

### Problema: No se reciben actualizaciones en tiempo real

**Posibles causas y soluciones:**

1. **Realtime no está activado en la tabla**
   ```sql
   -- Verificar si la tabla está en la publicación
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime' AND tablename = 'personas';

   -- Si no aparece, agregarla:
   ALTER PUBLICATION supabase_realtime ADD TABLE personas;
   ```

2. **Políticas RLS bloquean los cambios**
   ```sql
   -- Verificar políticas RLS
   SELECT * FROM pg_policies WHERE tablename = 'personas';

   -- Crear política de lectura para todos
   CREATE POLICY "allow_read_all" ON personas
   FOR SELECT USING (true);
   ```

3. **El navegador no soporta WebSockets**
   - Verifica que tu navegador soporte WebSockets
   - Revisa la consola del navegador en busca de errores

4. **Credenciales incorrectas**
   - Verifica que `SUPABASE_URL` y `SUPABASE_ANON_KEY` sean correctos
   - Revisa el archivo `.env`

### Problema: Mensaje "CHANNEL_ERROR"

```javascript
// En la consola del navegador
❌ Error al suscribirse a personas
```

**Soluciones:**

1. Revisa que la tabla exista: `SELECT * FROM personas;`
2. Verifica que Realtime esté habilitado en tu plan de Supabase
3. Revisa el límite de conexiones concurrentes en tu plan

### Problema: Demasiadas actualizaciones

Si recibes muchas actualizaciones y la app se vuelve lenta:

```javascript
// Aumentar el debounce
const { conectado } = useRealtimeSync(
  'personas',
  cargarPersonas,
  {
    debounceMs: 2000 // 2 segundos
  }
);
```

### Verificar Estado de Realtime

Ejecuta en la consola del navegador:

```javascript
// Verificar si Realtime está disponible
console.log('Realtime disponible:', window.electronAPI !== undefined);
console.log('Modo web:', window.__WEB_BRIDGE__);

// Ver canales activos
console.log('Canales:', supabaseUser.getChannels());
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Ejemplos de Realtime](https://supabase.com/docs/guides/realtime/extensions/postgres-changes)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 Componentes que Usan Realtime

Actualmente, los siguientes componentes tienen Realtime activado:

- ✅ **Personas** (`src/pages/Personas.jsx`)
  - Tabla: `personas`
  - Eventos: INSERT, UPDATE, DELETE

- ✅ **Proyectos Públicos** (`src/pages/ProyectosPublicos.jsx`)
  - Tabla: `proyectos`
  - Eventos: INSERT, UPDATE, DELETE

Para agregar Realtime a otros componentes, importa el hook:

```javascript
import { useRealtimeSync } from '../hooks/useRealtimeData';

// En tu componente
const { conectado, sincronizando, ultimaActualizacion } = useRealtimeSync(
  'nombre_tabla',
  funcionCargarDatos,
  {
    habilitado: window.__WEB_BRIDGE__ === true,
    debounceMs: 500
  }
);
```

---

## ✅ Checklist de Configuración

- [ ] Realtime activado en Supabase Dashboard
- [ ] Tablas agregadas a `supabase_realtime` publication
- [ ] Políticas RLS configuradas correctamente
- [ ] Variables de entorno `.env` configuradas
- [ ] Aplicación web funcionando en modo web (`npm run web`)
- [ ] Indicador "En vivo" visible en la interfaz
- [ ] Prueba de sincronización en dos pestañas exitosa

---

**¡Listo!** Tu aplicación ahora se sincroniza automáticamente en tiempo real. 🎉

Cualquier cambio en la base de datos se reflejará instantáneamente en todos los usuarios conectados, sin necesidad de recargar la página.

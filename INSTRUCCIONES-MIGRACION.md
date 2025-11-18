# Instrucciones para Ejecutar la Migración de fecha_registro

## Problema
La columna `fecha_registro` en la tabla `registros` de Supabase está definida como `TIMESTAMPTZ` (timestamp with time zone), lo que causa que las fechas se conviertan a UTC. Esto hace que cuando es 17 de noviembre en Perú (UTC-5), se guarde como 18 de noviembre.

## Solución
Cambiar el tipo de columna de `TIMESTAMPTZ` a `DATE` para que guarde solo la fecha sin conversiones de zona horaria.

## Pasos para Ejecutar la Migración

### 1. Acceder a Supabase SQL Editor

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto
4. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
5. Haz clic en **"+ New query"**

### 2. Ejecutar el Script de Migración

Copia y pega el siguiente código SQL en el editor:

```sql
-- ================================================
-- MIGRACIÓN: Cambiar fecha_registro de TIMESTAMPTZ a DATE
-- ================================================

-- 1. Modificar la columna fecha_registro a tipo DATE
ALTER TABLE registros
ALTER COLUMN fecha_registro TYPE DATE USING fecha_registro::DATE;

-- 2. Cambiar el default a CURRENT_DATE
ALTER TABLE registros
ALTER COLUMN fecha_registro SET DEFAULT CURRENT_DATE;
```

### 3. Ejecutar la Query

1. Haz clic en el botón **"Run"** (o presiona `Ctrl + Enter`)
2. Espera a que se ejecute la migración
3. Deberías ver un mensaje de **"Success"**

### 4. Verificar la Migración

Ejecuta esta query para verificar que la columna se cambió correctamente:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'registros' AND column_name = 'fecha_registro';
```

Deberías ver:
- **column_name**: `fecha_registro`
- **data_type**: `date`
- **column_default**: `CURRENT_DATE`

## Resultados Esperados

Después de ejecutar la migración:

✅ **Las fechas se guardarán correctamente** sin conversión a UTC
✅ **Fecha actual será 17** en lugar de 18 cuando sea 17 en Perú
✅ **Podrás ingresar cualquier fecha** (incluyendo 2027 o años futuros)
✅ **Los datos existentes** se convertirán automáticamente de timestamp a date (solo se guardará la fecha, sin la hora)

## Notas Importantes

- **Los datos existentes NO se perderán**: Los timestamps existentes se convertirán automáticamente a solo la fecha
- **No afecta otras columnas**: Solo cambia `fecha_registro`, las demás columnas permanecen igual
- **Es seguro ejecutar**: La migración utiliza `USING fecha_registro::DATE` para convertir los datos existentes correctamente

## Qué Hacer si Hay Problemas

Si encuentras algún error:

1. **Revisa que estás en la base de datos correcta**
2. **Verifica que la tabla `registros` existe**
3. **Contacta si necesitas ayuda** con el mensaje de error completo

## Después de la Migración

Una vez ejecutada la migración, la aplicación debería funcionar correctamente con:
- Fechas locales (hora de Perú) sin desfase UTC
- Capacidad de ingresar cualquier fecha manualmente (2027, 2030, etc.)
- Visualización correcta de fechas en la interfaz

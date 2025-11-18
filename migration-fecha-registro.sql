-- ================================================
-- MIGRACIÓN: Cambiar fecha_registro de TIMESTAMPTZ a DATE
-- ================================================
-- Este script corrige el problema de zona horaria en la columna fecha_registro
-- Cambia de TIMESTAMPTZ (que convierte a UTC) a DATE (que guarda solo la fecha)

-- 1. Modificar la columna fecha_registro a tipo DATE
ALTER TABLE registros
ALTER COLUMN fecha_registro TYPE DATE USING fecha_registro::DATE;

-- 2. Cambiar el default a CURRENT_DATE (fecha local, no NOW() que usa UTC)
ALTER TABLE registros
ALTER COLUMN fecha_registro SET DEFAULT CURRENT_DATE;

-- 3. Verificar que la columna se cambió correctamente
-- Ejecuta esto para comprobar:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'registros' AND column_name = 'fecha_registro';

-- NOTA: Esta migración NO afectará los datos existentes.
-- Los timestamps existentes se convertirán automáticamente a solo la fecha.

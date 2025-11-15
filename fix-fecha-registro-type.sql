-- ================================================
-- CORRECCIÓN: Cambiar fecha_registro de TIMESTAMPTZ a DATE
-- ================================================
-- Esto soluciona el problema de zona horaria donde las fechas
-- se guardaban con 1 día menos debido a la conversión UTC

-- Cambiar el tipo de columna de TIMESTAMPTZ a DATE
-- PostgreSQL automáticamente convertirá los valores existentes
ALTER TABLE registros
ALTER COLUMN fecha_registro TYPE DATE;

-- Cambiar el default para nuevos registros
ALTER TABLE registros
ALTER COLUMN fecha_registro SET DEFAULT CURRENT_DATE;

-- Verificar el cambio
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'registros'
  AND column_name IN ('fecha_registro', 'fecha_en_caja');

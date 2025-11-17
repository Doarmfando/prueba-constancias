-- Migración: Agregar campos de auditoría a la tabla registros
-- Fecha: 2025-01-17
-- Descripción: Agrega campos para registrar quién eliminó un registro y cuándo

-- Agregar columna eliminado_por
ALTER TABLE registros
ADD COLUMN IF NOT EXISTS eliminado_por BIGINT;

-- Agregar columna fecha_eliminacion
ALTER TABLE registros
ADD COLUMN IF NOT EXISTS fecha_eliminacion TIMESTAMPTZ;

-- Agregar foreign key para eliminado_por
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'registros_eliminado_por_fkey'
  ) THEN
    ALTER TABLE registros
    ADD CONSTRAINT registros_eliminado_por_fkey
    FOREIGN KEY (eliminado_por) REFERENCES usuarios(id);
  END IF;
END $$;

-- Crear índice para fecha_eliminacion
CREATE INDEX IF NOT EXISTS idx_registros_fecha_eliminacion ON registros(fecha_eliminacion);

-- Crear índice para eliminado_por
CREATE INDEX IF NOT EXISTS idx_registros_eliminado_por ON registros(eliminado_por);

-- ================================================
-- MIGRACIÓN: Agregar columnas para almacenamiento híbrido
-- Tabla: documentos_persona
-- Fecha: 2025-01-15
-- ================================================

-- Agregar columna para URL del archivo (si está en Supabase Storage)
ALTER TABLE documentos_persona
ADD COLUMN IF NOT EXISTS url_archivo TEXT;

-- Agregar columna para identificar dónde está almacenado
ALTER TABLE documentos_persona
ADD COLUMN IF NOT EXISTS ubicacion_almacenamiento TEXT DEFAULT 'LOCAL';

-- Agregar comentario para documentación
COMMENT ON COLUMN documentos_persona.url_archivo IS
  'URL pública del archivo si está almacenado en Supabase Storage, NULL si es local';

COMMENT ON COLUMN documentos_persona.ubicacion_almacenamiento IS
  'Ubicación del archivo: SUPABASE (en la nube) o LOCAL (en disco local)';

-- Crear índice para búsquedas por ubicación
CREATE INDEX IF NOT EXISTS idx_documentos_ubicacion
ON documentos_persona(ubicacion_almacenamiento);

-- Actualizar registros existentes (todos son locales por defecto)
UPDATE documentos_persona
SET ubicacion_almacenamiento = 'LOCAL'
WHERE ubicacion_almacenamiento IS NULL;

-- Verificar cambios
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'documentos_persona'
  AND column_name IN ('url_archivo', 'ubicacion_almacenamiento')
ORDER BY ordinal_position;
